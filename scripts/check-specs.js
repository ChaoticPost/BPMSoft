#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const SwaggerParser = require('@apidevtools/swagger-parser');
const { Parser, DiagnosticSeverity } = require('@asyncapi/parser');

const root = path.resolve(__dirname, '..');

async function checkOpenAPI() {
  const api = await SwaggerParser.validate(path.join(root, 'openapi.yaml'));
  const ops = Object.values(api.paths).flatMap((p) =>
    Object.keys(p).filter((k) => ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(k))
  );
  console.log(`OpenAPI  OK  ${api.openapi}  paths=${Object.keys(api.paths).length}  ops=${ops.length}`);
}

async function checkAsyncAPI() {
  const parser = new Parser();
  const raw = fs.readFileSync(path.join(root, 'asyncapi.yaml'), 'utf8');
  const { document, diagnostics } = await parser.parse(raw);
  const errors = (diagnostics || []).filter((d) => d.severity === DiagnosticSeverity.Error);
  if (errors.length || !document) {
    for (const e of errors) console.error('  ERROR:', e.message);
    throw new Error('AsyncAPI validation failed');
  }
  const j = document.json();
  const warns = (diagnostics || []).filter((d) => d.severity === DiagnosticSeverity.Warning);
  console.log(
    `AsyncAPI OK  ${j.asyncapi}  channels=${Object.keys(j.channels || {}).length}  ops=${Object.keys(j.operations || {}).length}`
  );
  for (const w of warns) console.log('  warn:', w.message);
}

(async () => {
  await checkOpenAPI();
  await checkAsyncAPI();
  console.log('All checks passed.');
})().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
