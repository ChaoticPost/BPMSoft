#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const SwaggerParser = require('@apidevtools/swagger-parser');
const { Parser, DiagnosticSeverity } = require('@asyncapi/parser');

const root = path.resolve(__dirname, '..');
const logLines = [];

function log(line) {
  console.log(line);
  logLines.push(line);
}

function meta() {
  const node = process.version;
  let npm = 'n/a';
  try {
    npm = execSync('npm -v', { encoding: 'utf8' }).trim();
  } catch {
    /* ignore */
  }
  let prism = 'n/a';
  try {
    prism = execSync('./node_modules/.bin/prism --version', {
      cwd: root,
      encoding: 'utf8',
    }).trim();
  } catch {
    /* ignore */
  }
  let head = 'n/a';
  let dirty = 'n/a';
  let tree = 'n/a';
  try {
    head = execSync('git rev-parse HEAD', { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    /* ignore */
  }
  try {
    const st = execSync('git status --porcelain', { cwd: root, encoding: 'utf8' }).trim();
    dirty = st ? 'DIRTY (uncommitted changes)' : 'clean';
  } catch {
    /* ignore */
  }
  try {
    tree = execSync('git write-tree', { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    /* ignore */
  }
  let swaggerParser = 'n/a';
  let asyncParser = 'n/a';
  try {
    swaggerParser = require('@apidevtools/swagger-parser/package.json').version;
  } catch {
    /* ignore */
  }
  try {
    asyncParser = require('@asyncapi/parser/package.json').version;
  } catch {
    /* ignore */
  }
  return { node, npm, prism, head, dirty, tree, swaggerParser, asyncParser };
}

async function checkOpenAPI() {
  const api = await SwaggerParser.validate(path.join(root, 'openapi.yaml'));
  const ops = Object.values(api.paths).flatMap((p) =>
    Object.keys(p).filter((k) =>
      ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(k)
    )
  );
  log(`OpenAPI  OK  ${api.openapi}  paths=${Object.keys(api.paths).length}  ops=${ops.length}`);
  const schemes = Object.keys(api.components?.securitySchemes || {});
  log(`  securitySchemes: ${schemes.join(', ')}`);
  log(`  servers: ${(api.servers || []).map((s) => s.url).join(' | ')}`);
}

async function checkAsyncAPI() {
  const parser = new Parser();
  const raw = fs.readFileSync(path.join(root, 'asyncapi.yaml'), 'utf8');
  const { document, diagnostics } = await parser.parse(raw);
  const errors = (diagnostics || []).filter((d) => d.severity === DiagnosticSeverity.Error);
  if (errors.length || !document) {
    for (const e of errors) log('  ERROR: ' + e.message);
    throw new Error('AsyncAPI validation failed');
  }
  const j = document.json();
  const warns = (diagnostics || []).filter((d) => d.severity === DiagnosticSeverity.Warning);
  log(
    `AsyncAPI OK  ${j.asyncapi}  channels=${Object.keys(j.channels || {}).length}  ops=${Object.keys(j.operations || {}).length}`
  );
  for (const w of warns) log('  warn: ' + w.message);
}

(async () => {
  const m = meta();
  log('=== ProfIT spec validation ===');
  log(`date: ${new Date().toISOString()}`);
  log(`node: ${m.node}`);
  log(`npm: ${m.npm}`);
  log(`prism: ${m.prism}`);
  log(`@apidevtools/swagger-parser: ${m.swaggerParser}`);
  log(`@asyncapi/parser: ${m.asyncParser}`);
  log(`git HEAD: ${m.head}`);
  log(`git working tree: ${m.dirty}`);
  log(`git write-tree: ${m.tree}`);
  log('');
  await checkOpenAPI();
  await checkAsyncAPI();
  log('');
  log('All checks passed.');
  if (m.dirty && m.dirty.startsWith('DIRTY')) {
    log('');
    log('NOTE: YAML/отчёт ещё не в одном коммите — закоммитьте и снова npm run check.');
  }

  const outDir = path.join(root, 'docs');
  fs.mkdirSync(outDir, { recursive: true });
  const logPath = path.join(outDir, 'validation_log.txt');
  fs.writeFileSync(logPath, logLines.join('\n') + '\n', 'utf8');
  console.log('\nLog saved:', logPath);
})().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
