// Render all generated .bpmn files to SVG (docs/report/) and PNG (/tmp/bpmn_preview)
// using a single puppeteer session + bpmn-js viewer.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import puppeteer from 'puppeteer-core';

const BPMN_DIR = resolve('docs/report/bpmn');
const OUT_SVG = resolve('docs/report');
const OUT_PNG = '/tmp/bpmn_preview';
mkdirSync(OUT_PNG, { recursive: true });

const viewerJs = resolve('node_modules/bpmn-js/dist/bpmn-viewer.production.min.js');
const files = process.argv.slice(2).length ? process.argv.slice(2)
  : ['01','02','03','04','05','06','07','08','09'].map(n => `ProfIT_BPMN_${n}.bpmn`);

const browser = await puppeteer.launch({
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 1200 });
page.setDefaultTimeout(60000);

for (const f of files) {
  const name = f.endsWith('.bpmn') ? f : `${f}.bpmn`;
  const xml = readFileSync(`${BPMN_DIR}/${name}`, 'utf8');
  const viewer = readFileSync(viewerJs, 'utf8');
  try {
    const svg = await page.evaluate(async (viewerSrc, xml) => {
      const s = document.createElement('script');
      s.textContent = viewerSrc;
      document.body.appendChild(s);
      const viewer = new window.BpmnJS({ container: document.body });
      await viewer.importXML(xml);
      const { svg } = await viewer.saveSVG();
      return svg;
    }, viewer, xml);
    const base = name.replace(/\.bpmn$/, '');
    writeFileSync(`${OUT_SVG}/${base}.svg`, svg);
    // png via same viewer screenshot approach: re-import and screenshot
    await page.evaluate(async (viewerSrc, xml) => {
      document.body.innerHTML = '';
      const s = document.createElement('script');
      s.textContent = viewerSrc;
      document.body.appendChild(s);
      const viewer = new window.BpmnJS({ container: document.body });
      await viewer.importXML(xml);
      viewer.get('canvas').zoom('fit-viewport', 'auto');
    }, viewer, xml);
    await page.screenshot({ path: `${OUT_PNG}/${base}.png`, fullPage: true });
    console.log('rendered', base);
  } catch (e) {
    console.log('FAIL', name, e.message);
  }
}
await browser.close();
