#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const lockPath = path.join(__dirname, '..', 'package-lock.json');
if (!fs.existsSync(lockPath)) process.exit(0);

const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));

function strip(obj) {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    obj.forEach(strip);
    return;
  }
  delete obj.funding;
  for (const v of Object.values(obj)) strip(v);
}

strip(lock);
fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');
