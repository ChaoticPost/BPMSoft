// Build: generate .bpmn files into docs/report/bpmn/ and render SVG (and PNG
// previews into /tmp) via bpmn-to-image.
// Usage: node scripts/bpmn/build.mjs [--render] [--only=N]
import { writeFileSync, mkdirSync } from 'node:fs';
import { ALL } from './diagrams.mjs';
import { buildXml, lint, lintGeometry, stats } from './lib.mjs';

const OUT_BPMN = new URL('../../docs/report/bpmn/', import.meta.url).pathname;
const OUT_SVG = new URL('../../docs/report/', import.meta.url).pathname;
const TMP = '/tmp/bpmn_preview';
mkdirSync(OUT_BPMN, { recursive: true });
mkdirSync(TMP, { recursive: true });

const only = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1];
const render = process.argv.includes('--render');

const specs = ALL.filter((s) => !only || s.file.endsWith(only.padStart(2, '0')));
let bad = 0;
for (const spec of specs) {
  const problems = [...lint(spec), ...lintGeometry(spec)];
  for (const p of problems) { console.log('LINT', p); bad++; }
  const xml = buildXml(spec);
  writeFileSync(`${OUT_BPMN}${spec.file}.bpmn`, xml);
  const st = stats(spec);
  console.log(`${spec.file}: nodes=${st.nodes} flows=${st.flows} joins=${st.joins} starts=${st.starts} ends=${st.ends} msg=${st.msg}`);
}

if (render) {
  const { convert } = await import('bpmn-to-image');
  for (const spec of specs) {
    const src = `${OUT_BPMN}${spec.file}.bpmn`;
    try {
      await convert(src, `${OUT_SVG}${spec.file}.svg`);
      await convert(src, `${TMP}/${spec.file}.png`);
      console.log(`rendered ${spec.file}`);
    } catch (e) {
      console.log(`RENDER FAIL ${spec.file}: ${e.message}`);
      bad++;
    }
  }
}
process.exit(bad ? 1 : 0);
