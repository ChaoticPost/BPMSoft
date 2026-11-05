// Validate .bpmn files on disk: refs, event-gateway fan-out, edge-through-node geometry.
import { readFileSync, readdirSync } from 'node:fs';

const DIR = new URL('../../docs/report/bpmn/', import.meta.url).pathname;
const files = readdirSync(DIR).filter((f) => f.endsWith('.bpmn')).sort();

const segInt = (a, b, c, d) => {
  const cross = (o, p, q) => (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]);
  const d1 = cross(c, d, a), d2 = cross(c, d, b), d3 = cross(a, b, c), d4 = cross(a, b, d);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
};
const inside = (pt, r) => pt[0] > r.x && pt[0] < r.x + r.w && pt[1] > r.y && pt[1] < r.y + r.h;
const segHitsRect = (p, q, r) => {
  // shrink rect 2px to ignore border grazes
  const rr = { x: r.x + 2, y: r.y + 2, w: r.w - 4, h: r.h - 4 };
  if (Math.max(p[0], q[0]) <= rr.x || Math.min(p[0], q[0]) >= rr.x + rr.w) return false;
  if (Math.max(p[1], q[1]) <= rr.y || Math.min(p[1], q[1]) >= rr.y + rr.h) return false;
  const corners = [[rr.x, rr.y], [rr.x + rr.w, rr.y], [rr.x + rr.w, rr.y + rr.h], [rr.x, rr.y + rr.h]];
  for (let i = 0; i < 4; i++) if (segInt(p, q, corners[i], corners[(i + 1) % 4])) return true;
  // interior fraction of the segment
  const mid = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  if (inside(mid, rr)) return true;
  return false;
};

let bad = 0;
for (const f of files) {
  const xml = readFileSync(DIR + f, 'utf8');
  const ids = new Set([...xml.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  const subs = new Set([...xml.matchAll(/<bpmn:subProcess id="([^"]+)"/g)].map((m) => m[1]));
  const probs = [];
  for (const m of xml.matchAll(/<bpmn:(?:sequenceFlow|messageFlow) id="([^"]+)"[^>]*sourceRef="([^"]+)"[^>]*targetRef="([^"]+)"/g)) {
    if (!ids.has(m[2])) probs.push(`${m[1]}: missing sourceRef ${m[2]}`);
    if (!ids.has(m[3])) probs.push(`${m[1]}: missing targetRef ${m[3]}`);
  }
  for (const m of xml.matchAll(/<bpmn:(?:incoming|outgoing|flowNodeRef)>([^<]+)</g)) {
    if (!ids.has(m[1])) probs.push(`dangling ref ${m[1]}`);
  }
  for (const m of xml.matchAll(/<bpmn:eventBasedGateway id="([^"]+)"[^>]*>([\s\S]*?)<\/bpmn:eventBasedGateway>/g)) {
    const n = (m[2].match(/<bpmn:outgoing>/g) || []).length;
    if (n < 2) probs.push(`eventGateway ${m[1]} has ${n} outgoing`);
  }
  const shapes = new Map(); // id -> rect of leaf nodes only
  for (const m of xml.matchAll(/<bpmndi:BPMNShape id="([^"]+)_di" bpmnElement="([^"]+)"[^>]*>\s*<dc:Bounds x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)) {
    const id = m[2];
    if (id.startsWith('Pool_') || id.startsWith('lane_') || subs.has(id)) continue; // containers
    shapes.set(id, { x: +m[3], y: +m[4], w: +m[5], h: +m[6] });
  }
  const participants = new Set([...xml.matchAll(/<bpmn:participant id="([^"]+)"(?!.*processRef)/g)].map((m) => m[1]));
  for (const m of xml.matchAll(/<bpmndi:BPMNEdge id="([^"]+)_di" bpmnElement="([^"]+)">([\s\S]*?)<\/bpmndi:BPMNEdge>/g)) {
    const edgeId = m[2];
    const flow = xml.match(new RegExp(`<bpmn:(sequenceFlow|messageFlow) id="${edgeId}"[^>]*sourceRef="([^"]+)"[^>]*targetRef="([^"]+)"`));
    const pts = [...m[3].matchAll(/<di:waypoint x="([\d.]+)" y="([\d.]+)"/g)].map((w) => [+w[1], +w[2]]);
    if (pts.length < 2) { probs.push(`${edgeId}: <2 waypoints`); continue; }
    const isMsg = flow && flow[1] === 'messageFlow';
    const src = flow?.[2], tgt = flow?.[3];
    for (let i = 0; i < pts.length - 1; i++) {
      // trim segment endpoints 6px so touching source/target borders doesn't count
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      const len = Math.hypot(bx - ax, by - ay) || 1;
      const t = 6 / len;
      const p = [ax + (bx - ax) * t, ay + (by - ay) * t];
      const q = [bx - (bx - ax) * t, by - (by - ay) * t];
      for (const [id, r] of shapes) {
        if (id === src || id === tgt) continue;
        if (isMsg && participants.has(id)) continue;
        if (segHitsRect(p, q, r)) probs.push(`${edgeId} seg${i} (${pts[i]}→${pts[i + 1]}) pierces ${id}`);
      }
    }
  }
  if (probs.length) { bad++; console.log(`== ${f}`); [...new Set(probs)].forEach((p) => console.log('   ' + p)); }
  else console.log(`OK ${f}`);
}
process.exit(bad ? 1 : 0);
