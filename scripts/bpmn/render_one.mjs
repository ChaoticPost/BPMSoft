import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import puppeteer from 'puppeteer-core';
const viewerJs = resolve('node_modules/bpmn-js/dist/bpmn-viewer.production.min.js');
const file = process.argv[2];
const browser = await puppeteer.launch({ executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--no-sandbox'] });
const page = await browser.newPage();
page.on('console', m => console.log('[page]', m.text().slice(0,200)));
page.on('pageerror', e => console.log('[err]', e.message.slice(0,300)));
const viewer = readFileSync(viewerJs, 'utf8');
const xml = readFileSync(file, 'utf8');
console.log('start import', file);
const res = await page.evaluate(async (viewerSrc, xml) => {
  const s = document.createElement('script'); s.textContent = viewerSrc; document.body.appendChild(s);
  const v = new window.BpmnJS({ container: document.body });
  try { await v.importXML(xml); const r = await v.saveSVG(); return 'OK ' + r.svg.length; }
  catch(e){ return 'ERR ' + e.message; }
}, viewer, xml);
console.log('result:', res);
await browser.close();
