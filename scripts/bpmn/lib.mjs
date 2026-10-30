// ProfIT BPMN generator: grid layout + BPMN 2.0 XML emitter with full BPMNDI.
// Supports: lanes, pools, expanded sub-processes, boundary events
// (timer/message/error), message flows to collapsed participants.
// bpmn-js sizes: task 100x80, gateway 50x50, event 36x36.

const SZ = {
  task: [100, 80], userTask: [100, 80], serviceTask: [100, 80],
  sendTask: [100, 80], receiveTask: [100, 80], manualTask: [100, 80],
  gateway: [50, 50], event: [36, 36],
};

const COLW = 175;
const ROWH = 150;
const LANE_HDR = 30;
const POOL_X = 60, POOL_Y = 60;
const CELL_PAD_X = 12;
const EXT_GAP = 110;
const EXT_H = 64;
const EXT_STEP = 96;
const SP_PAD = 16;     // subprocess inner padding
const SP_MARGIN = 10;  // subprocess margin inside its grid span

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

function nodeSize(n) {
  if (n.type === 'subProcess' || n.type === 'eventSub') {
    const c = n.span?.c ?? 2, r = n.span?.r ?? 1;
    return [c * COLW - SP_MARGIN * 2, r * ROWH - SP_MARGIN * 2];
  }
  return SZ[n.type] || SZ.task;
}

const rectOf = (r) => ({ l: r.x, t: r.y, r: r.x + r.w, b: r.y + r.h, cx: r.x + r.w / 2, cy: r.y + r.h / 2, w: r.w, h: r.h });

// ---------- layout ----------

export function layout(spec) {
  const lanes = spec.lanes.map((l, i) => ({ ...l, i }));
  let y = POOL_Y;
  for (const l of lanes) {
    l.top = y;
    l.h = l.rows * ROWH;
    y += l.h;
    l.bottom = y;
  }
  const poolH = y - POOL_Y;

  let maxCol = 0;
  for (const n of spec.nodes) {
    const spanC = (n.type === 'subProcess' || n.type === 'eventSub') ? (n.span?.c ?? 2) - 1 : 0;
    maxCol = Math.max(maxCol, (n.col ?? 0) + spanC);
  }
  const contentW = CELL_PAD_X + (maxCol + 1) * COLW + 30;
  const poolW = LANE_HDR + contentW;

  const cellX = (col) => POOL_X + LANE_HDR + CELL_PAD_X + col * COLW;
  const byId = {};
  const laneOf = (id) => lanes.find((l) => l.id === id) || lanes[0];

  for (const n of spec.nodes) {
    const lane = laneOf(n.lane);
    const [w, h] = nodeSize(n);
    if (n.type === 'subProcess' || n.type === 'eventSub') {
      n.x = cellX(n.col) + SP_MARGIN;
      n.y = lane.top + (n.row ?? 0) * ROWH + SP_MARGIN;
    } else {
      n.x = cellX(n.col) + (COLW - w) / 2;
      n.y = lane.top + (n.row ?? 0) * ROWH + (ROWH - h) / 2;
    }
    n.laneRef = lane;
    byId[n.id] = n;

    // inner elements of expanded subprocess
    if (n.children && n.children.length) {
      const innerW = w - SP_PAD * 2, innerH = h - SP_PAD * 2;
      const maxC = Math.max(...n.children.map((c) => c.col ?? 0)) + 1;
      const maxR = Math.max(...n.children.map((c) => c.row ?? 0)) + 1;
      const pitchC = innerW / maxC, pitchR = innerH / maxR;
      for (const ch of n.children) {
        const [cw, chh] = nodeSize(ch);
        ch.x = n.x + SP_PAD + (ch.col ?? 0) * pitchC + (pitchC - cw) / 2;
        ch.y = n.y + SP_PAD + (ch.row ?? 0) * pitchR + (pitchR - chh) / 2;
        ch.parent = n;
        byId[ch.id] = ch;
      }
    }
    // boundary events
    for (const b of n.boundary || []) {
      const side = b.side || 'bottom';
      const frac = b.frac ?? 0.5;
      if (side === 'bottom') { b.x = n.x + frac * w - 18; b.y = n.y + h - 18; }
      else if (side === 'top') { b.x = n.x + frac * w - 18; b.y = n.y - 18; }
      else if (side === 'right') { b.x = n.x + w - 18; b.y = n.y + frac * h - 18; }
      else { b.x = n.x - 18; b.y = n.y + frac * h - 18; }
      b.type = 'event'; b.boundaryOf = n; b.isBoundary = true;
      b.laneRef = lane;
      byId[b.id] = b;
    }
  }

  const ext = {};
  let ey = POOL_Y + poolH + EXT_GAP;
  for (const p of spec.externals || []) {
    const rec = { ...p, x: POOL_X, y: ey, w: poolW, h: EXT_H };
    rec.l = rec.x; rec.t = rec.y; rec.r = rec.x + rec.w; rec.b = rec.y + rec.h;
    rec.cx = rec.x + rec.w / 2; rec.cy = rec.y + rec.h / 2;
    ext[p.id] = rec;
    ey += EXT_STEP;
  }
  return { lanes, byId, ext, poolW, poolH, height: ey + 20 };
}

// ---------- edge routing ----------

function rect(n) {
  const [w, h] = nodeSize(n);
  return rectOf({ x: n.x, y: n.y, w, h });
}

function routeEdge(spec, f, ctx) {
  if (f.via) return f.via;
  const s = rect(ctx.byId[f.from]), d = rect(ctx.byId[f.to]);
  const exit = f.exit ?? 'right', enter = f.enter ?? 'left';
  const EP = {
    right: [f.exitX ?? s.r, f.exitY ?? s.cy], left: [f.exitX ?? s.l, f.exitY ?? s.cy],
    top: [f.exitX ?? s.cx, f.exitY ?? s.t], bottom: [f.exitX ?? s.cx, f.exitY ?? s.b],
  }[exit];
  const TP = {
    right: [f.enterX ?? d.r, f.enterY ?? d.cy], left: [f.enterX ?? d.l, f.enterY ?? d.cy],
    top: [f.enterX ?? d.cx, f.enterY ?? d.t], bottom: [f.enterX ?? d.cx, f.enterY ?? d.b],
  }[enter];
  const sameY = Math.abs(EP[1] - TP[1]) < 6, sameX = Math.abs(EP[0] - TP[0]) < 6;

  // direct Z-routes honour midX/midY overrides first
  if (f.midX !== undefined && exit === 'right' && enter === 'left')
    return [EP, [f.midX, EP[1]], [f.midX, TP[1]], TP];
  if (f.midY !== undefined && exit === 'bottom' && enter === 'top')
    return [EP, [EP[0], f.midY], [TP[0], f.midY], TP];
  if (f.midY !== undefined && exit === 'top' && enter === 'bottom')
    return [EP, [EP[0], f.midY], [TP[0], f.midY], TP];
  if (f.midX !== undefined && exit === 'bottom' && enter === 'left')
    return [EP, [f.midX, EP[1]], [f.midX, TP[1]], TP];
  if (f.midX !== undefined && exit === 'left' && enter === 'left')
    return [EP, [f.midX, EP[1]], [f.midX, TP[1]], TP];
  if (f.midX !== undefined && exit === 'right' && enter === 'right')
    return [EP, [f.midX, EP[1]], [f.midX, TP[1]], TP];

  if (exit === 'right' && enter === 'left') {
    if (sameY) return [EP, TP];
    const midX = f.midX ?? (s.r + d.l) / 2;
    return [EP, [midX, s.cy], [midX, d.cy], TP];
  }
  if (exit === 'top' && enter === 'bottom') {
    if (sameX) return [EP, TP];
    const midY = f.midY ?? (s.t + d.b) / 2;
    return [EP, [s.cx, midY], [d.cx, midY], TP];
  }
  if (exit === 'bottom' && enter === 'top') {
    if (sameX) return [EP, TP];
    const midY = f.midY ?? (s.b + d.t) / 2;
    return [EP, [s.cx, midY], [d.cx, midY], TP];
  }
  if (exit === 'top' && (enter === 'left' || enter === 'right'))
    return [EP, [s.cx, d.cy], TP];
  if (exit === 'bottom' && (enter === 'left' || enter === 'right'))
    return [EP, [s.cx, d.cy], TP];
  if (exit === 'right' && enter === 'top')
    return [EP, [d.cx, s.cy], TP];
  if (exit === 'right' && enter === 'bottom')
    return [EP, [d.cx, s.cy], TP];
  if (exit === 'left' && enter === 'top')
    return [EP, [d.cx, s.cy], TP];
  if (exit === 'left' && enter === 'bottom')
    return [EP, [d.cx, s.cy], TP];
  if (exit === 'bottom' && enter === 'left')
    return [EP, [s.cx, d.cy], TP];
  if (exit === 'bottom' && enter === 'right')
    return [EP, [s.cx, d.cy], TP];
  if (exit === 'top' && enter === 'right')
    return [EP, [s.cx, d.cy], TP];
  if (exit === 'left' && enter === 'left')
    return [EP, [f.midX ?? Math.min(s.l, d.l) - 24, s.cy], [f.midX ?? Math.min(s.l, d.l) - 24, d.cy], TP];
  if (exit === 'right' && enter === 'right')
    return [EP, [f.midX ?? Math.max(s.r, d.r) + 24, s.cy], [f.midX ?? Math.max(s.r, d.r) + 24, d.cy], TP];
  if (exit === 'top' && enter === 'top')
    return [EP, [s.cx, f.midY ?? Math.min(s.t, d.t) - 24], [d.cx, f.midY ?? Math.min(s.t, d.t) - 24], TP];
  if (exit === 'bottom' && enter === 'bottom')
    return [EP, [s.cx, f.midY ?? Math.max(s.b, d.b) + 24], [d.cx, f.midY ?? Math.max(s.b, d.b) + 24], TP];
  if (exit === 'left' && enter === 'right')
    return [EP, [f.midX ?? (s.l + d.r) / 2, s.cy], [f.midX ?? (s.l + d.r) / 2, d.cy], TP];
  // rails for backward edges
  if (f.rail !== undefined || f.railSide === 'top' || f.railSide === 'bottom') {
    const railY = f.rail ?? (f.railSide === 'top' ? Math.min(s.t, d.t) - 42 : Math.max(s.b, d.b) + 42);
    const top = railY < Math.min(s.t, d.t);
    const ey1 = top ? s.t : s.b, ey2 = top ? d.t : d.b;
    return [[s.cx, ey1], [s.cx, railY], [d.cx, railY], [d.cx, ey2]];
  }
  return [EP, TP];
}

function labelPos(pts, f) {
  if (f && f.labelAt === 'end') {
    const [x1, y1] = pts[pts.length - 2], [x2, y2] = pts[pts.length - 1];
    if (Math.abs(y2 - y1) < 1) return { x: (x1 + x2) / 2, y: y1 - 18 };
    return { x: x1 + 14, y: (y1 + y2) / 2 - 6 };
  }
  const [x1, y1] = pts[0], [x2, y2] = pts[1];
  if (Math.abs(y2 - y1) < 1) return { x: (x1 + x2) / 2, y: y1 - 18 };
  return { x: x1 + 14, y: (y1 + y2) / 2 - 6 };
}

// ---------- XML ----------

const TAG = {
  userTask: 'bpmn:userTask', serviceTask: 'bpmn:serviceTask', task: 'bpmn:task',
  sendTask: 'bpmn:sendTask', receiveTask: 'bpmn:receiveTask', manualTask: 'bpmn:manualTask',
};

function eventTag(n) {
  if (n.isBoundary) return 'bpmn:boundaryEvent';
  if (n.ev === 'end' || n.ev === 'endError' || n.ev === 'endTerminate') return 'bpmn:endEvent';
  if (n.ev === 'catchMessage' || n.ev === 'catchTimer' || n.ev === 'catchError') return 'bpmn:intermediateCatchEvent';
  return 'bpmn:startEvent';
}

function eventDef(n) {
  switch (n.ev) {
    case 'startMessage': case 'catchMessage': case 'boundaryMessage':
      return `      <bpmn:messageEventDefinition id="med_${n.id}"/>`;
    case 'startTimer': case 'catchTimer': case 'boundaryTimer':
      return `      <bpmn:timerEventDefinition id="ted_${n.id}"/>`;
    case 'boundaryError': case 'endError': case 'catchError':
      return `      <bpmn:errorEventDefinition id="erd_${n.id}"/>`;
    case 'endTerminate':
      return `      <bpmn:terminateEventDefinition id="trd_${n.id}"/>`;
    default: return null;
  }
}

function emitNode(defs, n, incoming, outgoing, indent) {
  const inc = (incoming[n.id] || []).map((f) => `${indent}  <bpmn:incoming>${f.id}</bpmn:incoming>`);
  const out = (outgoing[n.id] || []).map((f) => `${indent}  <bpmn:outgoing>${f.id}</bpmn:outgoing>`);
  const body = [...inc, ...out];
  if (n.type === 'gateway') {
    const kind = n.gw === 'event' ? 'bpmn:eventBasedGateway' : 'bpmn:exclusiveGateway';
    defs.push(`${indent}<${kind} id="${n.id}" name="${esc(n.name || '')}"${body.length ? '' : '/'}>`);
    if (body.length) defs.push(...body, `${indent}</${kind}>`);
    return;
  }
  if (n.type === 'event') {
    const tag = eventTag(n), edef = eventDef(n);
    const inner = [...body]; if (edef) inner.push(edef);
    const att = n.isBoundary ? ` attachedToRef="${n.boundaryOf.id}" cancelActivity="${n.interrupting === false ? 'false' : 'true'}"` : '';
    defs.push(`${indent}<${tag} id="${n.id}" name="${esc(n.name || '')}"${att}${inner.length ? '' : '/'}>`);
    if (inner.length) defs.push(...inner, `${indent}</${tag}>`);
    return;
  }
  const tag = TAG[n.type] || 'bpmn:task';
  defs.push(`${indent}<${tag} id="${n.id}" name="${esc(n.name || '')}"${body.length ? '' : '/'}>`);
  if (body.length) defs.push(...body, `${indent}</${tag}>`);
}

function emitSubProcess(defs, n, spec, indent) {
  const innerFlows = (n.innerFlows || []).map((f, i) => ({ id: f.id || `${n.id}_if_${i}`, ...f }));
  const inc = {}, out = {};
  for (const f of innerFlows) { (inc[f.to] ||= []).push(f); (out[f.from] ||= []).push(f); }
  const outerInc = (spec._inc[n.id] || []).map((f) => `${indent}  <bpmn:incoming>${f.id}</bpmn:incoming>`);
  const outerOut = (spec._out[n.id] || []).map((f) => `${indent}  <bpmn:outgoing>${f.id}</bpmn:outgoing>`);
  defs.push(`${indent}<bpmn:subProcess id="${n.id}" name="${esc(n.name || '')}">`);
  defs.push(...outerInc, ...outerOut);
  for (const ch of n.children || []) emitNode(defs, ch, inc, out, indent + '  ');
  for (const f of innerFlows) {
    const nm = f.name ? ` name="${esc(f.name)}"` : '';
    defs.push(`${indent}  <bpmn:sequenceFlow id="${f.id}"${nm} sourceRef="${f.from}" targetRef="${f.to}"/>`);
  }
  defs.push(`${indent}</bpmn:subProcess>`);
  return innerFlows;
}

export function buildXml(spec) {
  const ctx = layout(spec);
  const { ext, lanes, poolW, poolH, byId } = ctx;

  const flows = spec.flows.map((f, i) => ({ id: f.id || `flow_${i}`, ...f }));
  const msgs = (spec.messages || []).map((m, i) => ({ id: m.id || `msg_${i}`, ...m }));
  const incoming = {}, outgoing = {};
  for (const f of flows) { (incoming[f.to] ||= []).push(f); (outgoing[f.from] ||= []).push(f); }
  spec._inc = incoming; spec._out = outgoing;

  const procId = `Process_${spec.file}`, poolId = `Pool_${spec.file}`;
  const defs = [];
  defs.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  defs.push(`<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" id="Definitions_${spec.file}" targetNamespace="http://bpmn.io/schema/bpmn" exporter="ProfIT BPMN build" exporterVersion="1.0">`);

  defs.push(`  <bpmn:collaboration id="Collab_${spec.file}">`);
  defs.push(`    <bpmn:participant id="${poolId}" name="${esc(spec.pool)}" processRef="${procId}"/>`);
  for (const p of spec.externals || []) defs.push(`    <bpmn:participant id="${p.id}" name="${esc(p.name)}"/>`);
  for (const m of msgs) defs.push(`    <bpmn:messageFlow id="${m.id}" name="${esc(m.name || '')}" sourceRef="${m.from}" targetRef="${m.to}"/>`);
  defs.push(`  </bpmn:collaboration>`);

  defs.push(`  <bpmn:process id="${procId}" name="${esc(spec.pool)}" isExecutable="false">`);
  defs.push(`    <bpmn:laneSet id="LaneSet_${spec.file}">`);
  for (const l of lanes) {
    defs.push(`      <bpmn:lane id="${l.id}" name="${esc(l.name)}">`);
    for (const n of spec.nodes.filter((n) => (n.lane || lanes[0].id) === l.id)) {
      defs.push(`        <bpmn:flowNodeRef>${n.id}</bpmn:flowNodeRef>`);
      for (const b of n.boundary || []) defs.push(`        <bpmn:flowNodeRef>${b.id}</bpmn:flowNodeRef>`);
    }
    defs.push(`      </bpmn:lane>`);
  }
  defs.push(`    </bpmn:laneSet>`);

  const innerEdges = [];
  for (const n of spec.nodes) {
    if (n.type === 'subProcess') innerEdges.push(...emitSubProcess(defs, n, spec, '    '));
    else emitNode(defs, n, incoming, outgoing, '    ');
    for (const b of n.boundary || []) emitNode(defs, b, incoming, outgoing, '    ');
  }
  for (const f of flows) {
    const nm = f.name ? ` name="${esc(f.name)}"` : '';
    defs.push(`    <bpmn:sequenceFlow id="${f.id}"${nm} sourceRef="${f.from}" targetRef="${f.to}"/>`);
  }
  defs.push(`  </bpmn:process>`);

  defs.push(`  <bpmndi:BPMNDiagram id="BPMNDI_${spec.file}">`);
  defs.push(`    <bpmndi:BPMNPlane id="BPMNPlane_${spec.file}" bpmnElement="Collab_${spec.file}">`);
  defs.push(`      <bpmndi:BPMNShape id="${poolId}_di" bpmnElement="${poolId}" isHorizontal="true"><dc:Bounds x="${POOL_X}" y="${POOL_Y}" width="${poolW}" height="${poolH}"/></bpmndi:BPMNShape>`);
  for (const l of lanes) {
    defs.push(`      <bpmndi:BPMNShape id="${l.id}_di" bpmnElement="${l.id}" isHorizontal="true"><dc:Bounds x="${POOL_X + LANE_HDR}" y="${l.top}" width="${poolW - LANE_HDR}" height="${l.h}"/></bpmndi:BPMNShape>`);
  }
  for (const p of Object.values(ext)) {
    defs.push(`      <bpmndi:BPMNShape id="${p.id}_di" bpmnElement="${p.id}" isHorizontal="true"><dc:Bounds x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}"/></bpmndi:BPMNShape>`);
  }

  const emitShape = (n) => {
    const [nw, nh] = nodeSize(n);
    const exp = (n.type === 'subProcess') ? ' isExpanded="true"' : '';
    defs.push(`      <bpmndi:BPMNShape id="${n.id}_di" bpmnElement="${n.id}"${exp}><dc:Bounds x="${Math.round(n.x)}" y="${Math.round(n.y)}" width="${nw}" height="${nh}"/>`);
    if (n.name && (n.type === 'gateway' || n.type === 'event' || n.type === 'subProcess')) {
      const lw = Math.min(200, Math.max(60, String(n.name).length * (n.labelSide === 'top' ? 6 : 7)));
      const lh = n.labelSide === 'top' ? 14 : 30;
      const ly = n.type === 'subProcess' ? n.y + 2 : (n.labelSide === 'top' ? n.y - lh - 4 : n.y + nh + 4);
      defs.push(`        <bpmndi:BPMNLabel><dc:Bounds x="${Math.round(n.x + nw / 2 - lw / 2)}" y="${Math.round(ly)}" width="${lw}" height="${lh}"/></bpmndi:BPMNLabel>`);
    }
    defs.push(`      </bpmndi:BPMNShape>`);
  };
  for (const n of spec.nodes) {
    emitShape(n);
    for (const ch of n.children || []) emitShape(ch);
    for (const b of n.boundary || []) emitShape(b);
  }

  const emitEdge = (f, pts) => {
    const wp = pts.map(([x, y]) => `        <di:waypoint x="${Math.round(x)}" y="${Math.round(y)}"/>`).join('\n');
    defs.push(`      <bpmndi:BPMNEdge id="${f.id}_di" bpmnElement="${f.id}">\n${wp}`);
    if (f.name) {
      const lp = labelPos(pts, f);
      defs.push(`        <bpmndi:BPMNLabel><dc:Bounds x="${Math.round(lp.x - 40)}" y="${Math.round(lp.y)}" width="80" height="14"/></bpmndi:BPMNLabel>`);
    }
    defs.push(`      </bpmndi:BPMNEdge>`);
  };
  for (const f of flows) emitEdge(f, routeEdge(spec, f, ctx));
  for (const n of spec.nodes) {
    for (const [i, f0] of (n.innerFlows || []).entries()) {
      const f = { id: f0.id || `${n.id}_if_${i}`, ...f0 };
      emitEdge(f, routeEdge(spec, f, ctx));
    }
  }
  for (const m of msgs) {
    const pts = routeMsg(spec, m, ctx);
    const wp = pts.map(([x, y]) => `        <di:waypoint x="${Math.round(x)}" y="${Math.round(y)}"/>`).join('\n');
    defs.push(`      <bpmndi:BPMNEdge id="${m.id}_di" bpmnElement="${m.id}">\n${wp}`);
    if (m.name) {
      const lp = labelPos(pts, null);
      defs.push(`        <bpmndi:BPMNLabel><dc:Bounds x="${Math.round(lp.x - 60)}" y="${Math.round(lp.y)}" width="120" height="14"/></bpmndi:BPMNLabel>`);
    }
    defs.push(`      </bpmndi:BPMNEdge>`);
  }
  defs.push(`    </bpmndi:BPMNPlane>`);
  defs.push(`  </bpmndi:BPMNDiagram>`);
  defs.push(`</bpmn:definitions>`);
  return defs.join('\n');
}

function routeMsg(spec, m, ctx) {
  const a = ctx.byId[m.from] ? rect(ctx.byId[m.from]) : ctx.ext[m.from];
  const b = ctx.byId[m.to] ? rect(ctx.byId[m.to]) : ctx.ext[m.to];
  if (!a || !b) throw new Error(`bad message flow ${m.id}`);
  const anchor = ctx.byId[m.from] ? a : (ctx.byId[m.to] ? b : a);
  const ax = m.ax ?? anchor.cx, bx = m.bx ?? anchor.cx;
  const down = b.cy > a.cy;
  const y1 = down ? a.b : a.t;
  const y2 = down ? b.t : b.b;
  const midY = (y1 + y2) / 2;
  if (Math.abs(ax - bx) < 6) return [[ax, y1], [bx, y2]];
  return [[ax, y1], [ax, midY], [bx, midY], [bx, y2]];
}

export function stats(spec) {
  const countNodes = (nodes) => nodes.reduce((k, n) =>
    k + 1 + (n.children ? n.children.length : 0) + (n.boundary ? n.boundary.length : 0), 0);
  const joins = spec.nodes.filter((n) => n.type === 'gateway' &&
    spec.flows.filter((x) => x.to === n.id).length > 1 &&
    spec.flows.filter((x) => x.from === n.id).length === 1).length;
  const isStart = (n) => ['start', 'startMessage', 'startTimer'].includes(n.ev);
  const isEnd = (n) => ['end', 'endError', 'endTerminate'].includes(n.ev);
  const starts = spec.nodes.filter(isStart).length +
    spec.nodes.reduce((k, n) => k + (n.children || []).filter(isStart).length, 0);
  const ends = spec.nodes.filter(isEnd).length +
    spec.nodes.reduce((k, n) => k + (n.children || []).filter(isEnd).length, 0);
  const flows = spec.flows.length + spec.nodes.reduce((k, n) => k + (n.innerFlows || []).length, 0);
  return { nodes: countNodes(spec.nodes), flows, joins, starts, ends, msg: (spec.messages || []).length };
}

export function lint(spec) {
  const inc = {}, out = {};
  const allFlows = [...spec.flows];
  for (const n of spec.nodes) allFlows.push(...(n.innerFlows || []));
  for (const f of allFlows) { (inc[f.to] ||= []).push(f); (out[f.from] ||= []).push(f); }
  const problems = [];
  const visit = (n) => {
    const k = (inc[n.id] || []).length;
    if (n.type === 'gateway' && k > 2) problems.push(`${spec.file}: gateway ${n.id} "${n.name}" has ${k} incoming`);
    if (n.type !== 'gateway' && n.type !== 'event' && k > 1) problems.push(`${spec.file}: node ${n.id} "${n.name}" has ${k} incoming seq flows`);
    if (n.type === 'event' && !n.isBoundary && !['start','startMessage','startTimer'].includes(n.ev) && k > 1)
      problems.push(`${spec.file}: event ${n.id} "${n.name}" has ${k} incoming`);
    for (const ch of n.children || []) visit(ch);
  };
  for (const n of spec.nodes) visit(n);
  return problems;
}

// ---------- geometry lint: no edge may pass through a node rect ----------

function segHitsRect(x1, y1, x2, y2, R) {
  const rx = R.l + 3, ry = R.t + 3, rr = R.r - 3, rb = R.b - 3;
  if (rr <= rx || rb <= ry) return false;
  if (y1 === y2) {
    if (y1 <= ry || y1 >= rb) return false;
    return Math.min(x1, x2) < rr && Math.max(x1, x2) > rx;
  }
  if (x1 === x2) {
    if (x1 <= rx || x1 >= rr) return false;
    return Math.min(y1, y2) < rb && Math.max(y1, y2) > ry;
  }
  for (let t = 0.02; t < 1; t += 0.02) {
    if (x1 + (x2 - x1) * t > rx && x1 + (x2 - x1) * t < rr && y1 + (y2 - y1) * t > ry && y1 + (y2 - y1) * t < rb) return true;
  }
  return false;
}

export function lintGeometry(spec) {
  const ctx = layout(spec);
  const problems = [];
  const rects = [];
  const put = (n) => {
    const [w, h] = nodeSize(n);
    rects.push({ id: n.id, name: n.name, R: rectOf({ x: n.x, y: n.y, w, h }) });
  };
  for (const n of spec.nodes) {
    put(n);
    for (const ch of n.children || []) put(ch);
    for (const b of n.boundary || []) put(b);
  }

  const checkEdge = (f, pts, excludeIds) => {
    const excl = new Set(excludeIds);
    for (const { id, name, R } of rects) {
      if (excl.has(id)) continue;
      for (let i = 0; i < pts.length - 1; i++) {
        const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
        if (segHitsRect(x1, y1, x2, y2, R)) {
          problems.push(`${spec.file}: ${f.id} (${f.from}->${f.to}) crosses ${id} "${name}"`);
          break;
        }
      }
    }
  };

  const exclFor = (f, extra = []) => {
    const e = [f.from, f.to, ...extra];
    for (const id of [f.from, f.to]) {
      const n = ctx.byId[id];
      if (n?.isBoundary) e.push(n.boundaryOf.id);
      if (n?.parent) e.push(n.parent.id);
    }
    return e;
  };

  spec.flows.forEach((f0, i) => {
    const f = { id: f0.id || `flow_${i}`, ...f0 };
    checkEdge(f, routeEdge(spec, f, ctx), exclFor(f));
  });
  for (const n of spec.nodes) {
    (n.innerFlows || []).forEach((f0, i) => {
      const f = { id: f0.id || `${n.id}_if_${i}`, ...f0 };
      checkEdge(f, routeEdge(spec, f, ctx), exclFor(f, [n.id]));
    });
  }
  (spec.messages || []).forEach((m0, i) => {
    const m = { id: m0.id || `msg_${i}`, ...m0 };
    const extra = [];
    for (const id of [m.from, m.to]) {
      const n = ctx.byId[id];
      if (n?.parent) extra.push(n.parent.id);
    }
    checkEdge(m, routeMsg(spec, m, ctx), [m.from, m.to, ...extra]);
  });

  const poolB = POOL_Y + ctx.poolH, poolR = POOL_X + ctx.poolW;
  for (const { id, name, R } of rects) {
    if (R.l < POOL_X || R.r > poolR || R.t < POOL_Y || R.b > poolB)
      problems.push(`${spec.file}: node ${id} "${name}" exceeds pool bounds`);
  }
  return problems;
}
