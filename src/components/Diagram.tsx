import { useId, type ReactNode } from 'react';
import { parseDiagram, type Diagram as DiagramData } from '../content/diagram';

/*
 * Themed SVG pictures for ```diagram fences (see content/diagram.ts). Everything is drawn with the
 * theme's colour tokens, so diagrams follow light/dark mode.
 */

const C = {
  node: 'fill-surface-2 stroke-faint/70',
  nodeHi: 'fill-[color-mix(in_oklab,var(--color-accent)_24%,var(--color-surface))] stroke-accent',
  text: 'fill-ink',
  muted: 'fill-muted',
  faint: 'fill-faint',
  edge: 'stroke-faint/80',
  edgeHi: 'stroke-accent',
};
const MONO = 'var(--font-mono)';
const SANS = 'var(--font-sans)';
const charW = (size: number) => size * 0.62;
/** Circle radius and font size that fit a node label of `len` characters. */
const nodeSize = (len: number) => {
  const font = len > 4 ? 11.5 : 13;
  return { r: Math.max(17, Math.min(36, 9 + (len * charW(font)) / 2 + 2)), font };
};
const fmt = (v: string | number) => String(v);

function Frame({ w, h, caption, children, label, x0 = 0, y0 = 0 }: { w: number; h: number; caption?: string; children: ReactNode; label: string; x0?: number; y0?: number }) {
  return (
    <figure className="diagram my-5 overflow-x-auto">
      <svg viewBox={`${x0} ${y0} ${w} ${h}`} width="100%" style={{ maxWidth: w, minWidth: Math.min(w, 300) }} className="mx-auto block" role="img" aria-label={caption ?? label}>
        {children}
      </svg>
      {caption && <figcaption className="mx-auto mt-2 max-w-[60ch] text-center text-[0.8rem] leading-snug text-muted">{caption}</figcaption>}
    </figure>
  );
}

function Markers({ id }: { id: string }) {
  return (
    <defs>
      {(['n', 'h'] as const).map((k) => (
        <marker key={k} id={`${id}-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" className={k === 'h' ? 'fill-accent' : 'fill-faint'} />
        </marker>
      ))}
    </defs>
  );
}

function Badge({ x, y, n }: { x: number; y: number; n: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={8.5} className="fill-accent" />
      <text x={x} y={y + 3.5} textAnchor="middle" fontSize={10} fontWeight={700} fill="white" fontFamily={SANS}>
        {n}
      </text>
    </g>
  );
}

// ---------- tree ----------

function TreeView({ d }: { d: Extract<DiagramData, { type: 'tree' }> }) {
  interface N {
    v: string | number;
    l?: number;
    r?: number;
    depth: number;
    x: number;
  }
  const nodes: N[] = [{ v: d.values[0]!, depth: 0, x: 0 }];
  const queue = [0];
  let i = 1;
  while (queue.length && i < d.values.length) {
    const p = queue.shift()!;
    for (const side of ['l', 'r'] as const) {
      if (i >= d.values.length) break;
      const v = d.values[i++];
      if (v === null) continue;
      nodes.push({ v, depth: nodes[p].depth + 1, x: 0 });
      nodes[p][side] = nodes.length - 1;
      queue.push(nodes.length - 1);
    }
  }
  // x by inorder position, y by depth.
  let k = 0;
  const walk = (n: number | undefined) => {
    if (n === undefined) return;
    walk(nodes[n].l);
    nodes[n].x = k++;
    walk(nodes[n].r);
  };
  walk(0);
  const maxLen = Math.max(...nodes.map((n) => fmt(n.v).length));
  const { r, font } = nodeSize(maxLen);
  const gx = Math.max(44, r * 2 + 10);
  const gy = 66;
  const pad = 26;
  const depth = Math.max(...nodes.map((n) => n.depth));
  const hasNotes = !!d.notes && Object.keys(d.notes).length > 0;
  const w = k * gx + pad * 2 - (gx - 2 * r);
  const h = depth * gy + r * 2 + pad * 2 + (hasNotes ? 16 : 0);
  const pos = (n: N) => ({ x: pad + r + n.x * gx, y: pad + r + n.depth * gy });
  const hi = new Set((d.highlight ?? []).map(String));
  const orderLeft = [...(d.order ?? []).map(String)];
  const badges = new Map<number, number>();
  orderLeft.forEach((v, idx) => {
    const target = nodes.findIndex((n, j) => fmt(n.v) === v && !badges.has(j));
    if (target !== -1) badges.set(target, idx + 1);
  });
  return (
    <Frame w={w} h={h} caption={d.caption} label="Binary tree">
      {nodes.map((n, j) =>
        (['l', 'r'] as const).map((s) => {
          const c = n[s];
          if (c === undefined) return null;
          const a = pos(n);
          const b = pos(nodes[c]);
          return <line key={`${j}${s}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeWidth={1.6} className={C.edge} />;
        }),
      )}
      {nodes.map((n, j) => {
        const p = pos(n);
        const isHi = hi.has(fmt(n.v));
        const note = d.notes?.[fmt(n.v)];
        return (
          <g key={j}>
            <circle cx={p.x} cy={p.y} r={r} strokeWidth={isHi ? 2.2 : 1.4} className={isHi ? C.nodeHi : C.node} />
            <text x={p.x} y={p.y + font / 3} textAnchor="middle" fontSize={font} fontFamily={MONO} className={C.text} fontWeight={isHi ? 700 : 500}>
              {fmt(n.v)}
            </text>
            {badges.has(j) && <Badge x={p.x + r * 0.8} y={p.y - r * 0.8} n={badges.get(j)!} />}
            {note && (
              <text x={p.x} y={p.y + r + 14} textAnchor="middle" fontSize={10.5} fontFamily={SANS} className="fill-accent-soft" fontWeight={600}>
                {note}
              </text>
            )}
          </g>
        );
      })}
    </Frame>
  );
}

// ---------- graph ----------

function GraphView({ d }: { d: Extract<DiagramData, { type: 'graph' }> }) {
  const mid = useId().replace(/:/g, '');
  const ids = d.nodes.map((n) => (typeof n === 'string' ? n : n.id));
  const { r, font } = nodeSize(Math.max(...ids.map((s) => s.length)));
  const pad = r + 22;
  let pts: Record<string, { x: number; y: number }> = {};
  let w = 0;
  let h = 0;
  const manual = d.nodes.every((n) => typeof n !== 'string');
  if (manual) {
    const raw = d.nodes as { id: string; x: number; y: number }[];
    const minX = Math.min(...raw.map((n) => n.x));
    const maxX = Math.max(...raw.map((n) => n.x));
    const minY = Math.min(...raw.map((n) => n.y));
    const maxY = Math.max(...raw.map((n) => n.y));
    const sx = maxX - minX || 1;
    const sy = maxY - minY || 1;
    const scale = Math.min(110, 460 / sx, 300 / sy);
    for (const n of raw) pts[n.id] = { x: pad + (n.x - minX) * scale, y: pad + (n.y - minY) * scale };
    w = (maxX - minX) * scale + pad * 2;
    h = (maxY - minY) * scale + pad * 2;
  } else if (d.layout === 'layers') {
    const adj = new Map(ids.map((id) => [id, [] as string[]]));
    for (const [a, b] of d.edges) {
      adj.get(a)!.push(b);
      if (!d.directed) adj.get(b)!.push(a);
    }
    const layer = new Map<string, number>();
    for (const start of ids) {
      if (layer.has(start)) continue;
      const base = layer.size ? Math.max(...layer.values()) + 1 : 0;
      layer.set(start, base);
      const q = [start];
      while (q.length) {
        const u = q.shift()!;
        for (const v of adj.get(u)!) if (!layer.has(v)) {
          layer.set(v, layer.get(u)! + 1);
          q.push(v);
        }
      }
    }
    const cols: string[][] = [];
    for (const id of ids) (cols[layer.get(id)!] ??= []).push(id);
    const gx = 112;
    const gy = 74;
    const tallest = Math.max(...cols.map((c) => c?.length ?? 0));
    w = (cols.length - 1) * gx + pad * 2;
    h = (tallest - 1) * gy + pad * 2;
    cols.forEach((col, ci) => col?.forEach((id, ri) => (pts[id] = { x: pad + ci * gx, y: pad + (ri + (tallest - col.length) / 2) * gy })));
  } else {
    const n = ids.length;
    const R = n <= 1 ? 0 : Math.max(70, (n * (r * 2 + 26)) / (2 * Math.PI));
    w = h = R * 2 + pad * 2;
    pts = Object.fromEntries(ids.map((id, i) => [id, { x: w / 2 + R * Math.cos(-Math.PI / 2 + (2 * Math.PI * i) / n), y: h / 2 + R * Math.sin(-Math.PI / 2 + (2 * Math.PI * i) / n) }]));
  }
  if (d.notes) h += 12;
  const hiNodes = new Set(d.highlight ?? []);
  for (const x of d.path ?? []) hiNodes.add(x);
  const pathEdges = new Set<string>();
  (d.path ?? []).forEach((x, i, a) => {
    if (i === 0) return;
    pathEdges.add(`${a[i - 1]}>${x}`);
    if (!d.directed) pathEdges.add(`${x}>${a[i - 1]}`);
  });
  const edgeSet = new Set(d.edges.map(([a, b]) => `${a}>${b}`));
  const badges = new Map((d.order ?? []).map((id, i) => [id, i + 1]));
  const geoms = d.edges.map((e, i) => {
    const [a, b] = e;
    const A = pts[a];
    const B = pts[b];
    const dx = B.x - A.x;
    const dy = B.y - A.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    // Two-way directed edges sit side by side.
    const off = d.directed && edgeSet.has(`${b}>${a}`) ? 5 : 0;
    const ox = -uy * off;
    const oy = ux * off;
    // An edge that would run through another node bows out around it.
    const blocked = ids.some((id) => {
      if (id === a || id === b) return false;
      const P = pts[id];
      const t = ((P.x - A.x) * dx + (P.y - A.y) * dy) / (len * len);
      return t > 0 && t < 1 && Math.hypot(A.x + t * dx - P.x, A.y + t * dy - P.y) < r + 6;
    });
    const bow = blocked ? Math.min(46, len * 0.3) : 0;
    // Bow away from the middle of the picture, where there's usually room.
    const gx = ids.reduce((acc, id) => acc + pts[id].x, 0) / ids.length;
    const gy = ids.reduce((acc, id) => acc + pts[id].y, 0) / ids.length;
    const side = -uy * (gx - (A.x + B.x) / 2) + ux * (gy - (A.y + B.y) / 2) > 0 ? -1 : 1;
    const cx = (A.x + B.x) / 2 - uy * bow * 2 * side + ox;
    const cy = (A.y + B.y) / 2 + ux * bow * 2 * side + oy;
    // Start/end on the circles, aimed at the control point when bowed.
    const aim = (from: { x: number; y: number }, to: { x: number; y: number }, pad: number) => {
      const l = Math.hypot(to.x - from.x, to.y - from.y) || 1;
      return { x: from.x + ((to.x - from.x) / l) * pad, y: from.y + ((to.y - from.y) / l) * pad };
    };
    const s1 = blocked ? aim(A, { x: cx, y: cy }, r) : { x: A.x + ux * r + ox, y: A.y + uy * r + oy };
    const s2 = blocked ? aim(B, { x: cx, y: cy }, r + (d.directed ? 2 : 0)) : { x: B.x - ux * (r + (d.directed ? 2 : 0)) + ox, y: B.y - uy * (r + (d.directed ? 2 : 0)) + oy };
    const x1 = s1.x;
    const y1 = s1.y;
    const x2 = s2.x;
    const y2 = s2.y;
    const isHi = pathEdges.has(`${a}>${b}`);
    const wgt = e[2];
    const mx = blocked ? (x1 + x2) / 4 + cx / 2 : (x1 + x2) / 2 + ox * 1.6;
    const my = blocked ? (y1 + y2) / 4 + cy / 2 : (y1 + y2) / 2 + oy * 1.6;
    const wl = wgt === undefined ? '' : fmt(wgt);
    return { e, i, x1, y1, x2, y2, cx, cy, blocked, isHi, wl, mx, my };
  });
  // Bowed edges can reach past the nodes: widen the picture to fit their curves.
  let vx0 = 0;
  let vy0 = 0;
  let vx1 = w;
  let vy1 = h;
  for (const g of geoms) if (g.blocked) {
    const apex = { x: (g.x1 + g.x2) / 4 + g.cx / 2, y: (g.y1 + g.y2) / 4 + g.cy / 2 };
    vx0 = Math.min(vx0, apex.x - 12);
    vy0 = Math.min(vy0, apex.y - 12);
    vx1 = Math.max(vx1, apex.x + 12);
    vy1 = Math.max(vy1, apex.y + 12);
  }
  return (
    <Frame w={vx1 - vx0} h={vy1 - vy0} x0={vx0} y0={vy0} caption={d.caption} label="Graph">
      <Markers id={mid} />
      {geoms.map(({ i, x1, y1, x2, y2, cx, cy, blocked, isHi, wl, mx, my }) => {
        return (
          <g key={i}>
            <path
              d={blocked ? `M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}` : `M${x1} ${y1} L${x2} ${y2}`}
              fill="none"
              strokeWidth={isHi ? 2.6 : 1.6}
              className={isHi ? C.edgeHi : C.edge}
              markerEnd={d.directed ? `url(#${mid}-${isHi ? 'h' : 'n'})` : undefined}
            />
            {wl && (
              <g>
                <rect x={mx - (wl.length * 7 + 8) / 2} y={my - 9} width={wl.length * 7 + 8} height={17} rx={5} className="fill-surface stroke-line" strokeWidth={1} />
                <text x={mx} y={my + 4} textAnchor="middle" fontSize={11} fontFamily={MONO} className={isHi ? 'fill-accent-soft' : C.muted} fontWeight={600}>
                  {wl}
                </text>
              </g>
            )}
          </g>
        );
      })}
      {ids.map((id) => {
        const p = pts[id];
        const isHi = hiNodes.has(id);
        return (
          <g key={id}>
            <circle cx={p.x} cy={p.y} r={r} strokeWidth={isHi ? 2.2 : 1.4} className={isHi ? C.nodeHi : C.node} />
            <text x={p.x} y={p.y + font / 3} textAnchor="middle" fontSize={font} fontFamily={MONO} className={C.text} fontWeight={isHi ? 700 : 500}>
              {id}
            </text>
            {badges.has(id) && <Badge x={p.x + r * 0.8} y={p.y - r * 0.8} n={badges.get(id)!} />}
            {d.notes?.[id] && (
              <text x={p.x} y={p.y + r + 14} textAnchor="middle" fontSize={10.5} fontFamily={SANS} className="fill-accent-soft" fontWeight={600}>
                {d.notes[id]}
              </text>
            )}
          </g>
        );
      })}
    </Frame>
  );
}

// ---------- array / list rows ----------

interface Row {
  label?: string;
  values: (string | number)[];
  highlight?: number[];
  dim?: number[];
  pointers?: Record<string, number>;
  window?: [number, number];
  cycleTo?: number;
}

function pointerGroups(p?: Record<string, number>): Map<number, string> {
  const m = new Map<number, string>();
  for (const [k, i] of Object.entries(p ?? {})) m.set(i, m.has(i) ? `${m.get(i)},${k}` : k);
  return m;
}

function ArrayView({ d }: { d: Extract<DiagramData, { type: 'array' }> }) {
  const rows: Row[] = d.rows ?? [{ values: d.values ?? [], highlight: d.highlight, dim: d.dim, pointers: d.pointers, window: d.window }];
  const all = rows.flatMap((r) => r.values.map(fmt));
  const cw = Math.max(40, Math.min(96, 16 + Math.max(...all.map((s) => s.length)) * charW(14)));
  const ch = 38;
  if (d.vertical) {
    const r = rows[0];
    const n = r.values.length;
    const ptr = pointerGroups(r.pointers);
    const w = cw + 150;
    const h = n * ch + 48;
    const x0 = 75;
    return (
      <Frame w={w} h={h} caption={d.caption} label="Stack">
        <path d={`M${x0 - 6} 14 V${14 + n * ch + 6} H${x0 + cw + 6} V14`} fill="none" strokeWidth={2} className="stroke-faint" />
        {r.values.map((v, i) => {
          const top = i === n - 1;
          const y = 14 + (n - 1 - i) * ch;
          const isHi = r.highlight?.includes(i);
          return (
            <g key={i} opacity={r.dim?.includes(i) ? 0.38 : 1}>
              <rect x={x0} y={y + 3} width={cw} height={ch - 6} rx={6} strokeWidth={isHi ? 2 : 1.3} className={isHi ? C.nodeHi : C.node} />
              <text x={x0 + cw / 2} y={y + ch / 2 + 5} textAnchor="middle" fontSize={14} fontFamily={MONO} className={C.text}>
                {fmt(v)}
              </text>
              {top && (
                <text x={x0 + cw + 14} y={y + ch / 2 + 4} fontSize={11} fontFamily={SANS} className={C.muted}>
                  ← top
                </text>
              )}
              {ptr.has(i) && (
                <text x={x0 - 12} y={y + ch / 2 + 4} textAnchor="end" fontSize={11} fontWeight={700} fontFamily={MONO} className="fill-accent-soft">
                  {ptr.get(i)} →
                </text>
              )}
            </g>
          );
        })}
      </Frame>
    );
  }
  const labelW = rows.some((r) => r.label) ? Math.max(...rows.map((r) => (r.label ?? '').length)) * 6.6 + 16 : 0;
  const showIdx = d.indices !== false;
  const hasPtr = rows.map((r) => Object.keys(r.pointers ?? {}).length > 0);
  const rowH = rows.map((_, i) => ch + (hasPtr[i] ? 34 : 10));
  const maxN = Math.max(...rows.map((r) => r.values.length));
  const x0 = 12 + labelW;
  const top0 = showIdx ? 22 : 8;
  const w = x0 + maxN * cw + 14;
  const h = top0 + rowH.reduce((a, b) => a + b, 0) + 4;
  let y = top0;
  return (
    <Frame w={w} h={h} caption={d.caption} label="Array">
      {showIdx &&
        Array.from({ length: maxN }, (_, i) => (
          <text key={i} x={x0 + i * cw + cw / 2} y={14} textAnchor="middle" fontSize={10} fontFamily={MONO} className={C.faint}>
            {i}
          </text>
        ))}
      {rows.map((r, ri) => {
        const yy = y;
        y += rowH[ri];
        const ptr = pointerGroups(r.pointers);
        return (
          <g key={ri}>
            {r.label && (
              <text x={x0 - 10} y={yy + ch / 2 + 4} textAnchor="end" fontSize={11} fontFamily={SANS} className={C.muted} fontWeight={600}>
                {r.label}
              </text>
            )}
            {r.values.map((v, i) => {
              const isHi = r.highlight?.includes(i);
              return (
                <g key={i} opacity={r.dim?.includes(i) ? 0.35 : 1}>
                  <rect x={x0 + i * cw} y={yy} width={cw} height={ch} strokeWidth={isHi ? 2 : 1.2} className={isHi ? C.nodeHi : C.node} />
                  <text x={x0 + i * cw + cw / 2} y={yy + ch / 2 + 5} textAnchor="middle" fontSize={14} fontFamily={MONO} className={C.text} fontWeight={isHi ? 700 : 500}>
                    {fmt(v)}
                  </text>
                </g>
              );
            })}
            {r.window && (
              <rect x={x0 + r.window[0] * cw - 3} y={yy - 3} width={(r.window[1] - r.window[0] + 1) * cw + 6} height={ch + 6} rx={7} fill="none" strokeWidth={2.4} className="stroke-accent" strokeDasharray="6 3" />
            )}
            {[...ptr].map(([i, label]) => {
              const cx = x0 + i * cw + cw / 2;
              return (
                <g key={i}>
                  <path d={`M${cx} ${yy + ch + 15} L${cx} ${yy + ch + 5} M${cx - 4} ${yy + ch + 9} L${cx} ${yy + ch + 4} L${cx + 4} ${yy + ch + 9}`} fill="none" strokeWidth={1.6} className="stroke-accent-soft" />
                  <text x={cx} y={yy + ch + 27} textAnchor="middle" fontSize={11} fontWeight={700} fontFamily={MONO} className="fill-accent-soft">
                    {label}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
    </Frame>
  );
}

function ListView({ d }: { d: Extract<DiagramData, { type: 'list' }> }) {
  const mid = useId().replace(/:/g, '');
  const rows: Row[] = d.rows ?? [{ values: d.values ?? [], highlight: d.highlight, dim: d.dim, pointers: d.pointers, cycleTo: d.cycleTo }];
  const all = rows.flatMap((r) => r.values.map(fmt));
  const nw = Math.max(40, Math.min(90, 18 + Math.max(...all.map((s) => s.length)) * charW(14)));
  const nh = 34;
  const gap = 30;
  const labelW = rows.some((r) => r.label) ? Math.max(...rows.map((r) => (r.label ?? '').length)) * 6.6 + 16 : 0;
  const x0 = 12 + labelW;
  const rowH = rows.map((r) => nh + (Object.keys(r.pointers ?? {}).length ? 34 : 12) + (r.cycleTo !== undefined ? 22 : 0));
  const maxN = Math.max(...rows.map((r) => r.values.length));
  const w = x0 + maxN * (nw + gap) + 30;
  const h = 10 + rowH.reduce((a, b) => a + b, 0);
  let y = 10;
  return (
    <Frame w={w} h={h} caption={d.caption} label="Linked list">
      <Markers id={mid} />
      {rows.map((r, ri) => {
        const yy = y;
        y += rowH[ri];
        const ptr = pointerGroups(r.pointers);
        const n = r.values.length;
        const nx = (i: number) => x0 + i * (nw + gap);
        return (
          <g key={ri}>
            {r.label && (
              <text x={x0 - 10} y={yy + nh / 2 + 4} textAnchor="end" fontSize={11} fontFamily={SANS} className={C.muted} fontWeight={600}>
                {r.label}
              </text>
            )}
            {r.values.map((v, i) => {
              const isHi = r.highlight?.includes(i);
              return (
                <g key={i} opacity={r.dim?.includes(i) ? 0.35 : 1}>
                  <rect x={nx(i)} y={yy} width={nw} height={nh} rx={8} strokeWidth={isHi ? 2 : 1.3} className={isHi ? C.nodeHi : C.node} />
                  <text x={nx(i) + nw / 2} y={yy + nh / 2 + 5} textAnchor="middle" fontSize={14} fontFamily={MONO} className={C.text} fontWeight={isHi ? 700 : 500}>
                    {fmt(v)}
                  </text>
                  {i < n - 1 && <line x1={nx(i) + nw + 2} y1={yy + nh / 2} x2={nx(i + 1) - 3} y2={yy + nh / 2} strokeWidth={1.6} className={C.edge} markerEnd={`url(#${mid}-n)`} />}
                </g>
              );
            })}
            {r.cycleTo === undefined ? (
              <text x={nx(n - 1) + nw + 8} y={yy + nh / 2 + 4} fontSize={11} fontFamily={MONO} className={C.faint}>
                → null
              </text>
            ) : (
              <path
                d={`M${nx(n - 1) + nw / 2} ${yy + nh + 2} C ${nx(n - 1) + nw / 2} ${yy + nh + 26}, ${nx(r.cycleTo) + nw / 2} ${yy + nh + 26}, ${nx(r.cycleTo) + nw / 2} ${yy + nh + 4}`}
                fill="none"
                strokeWidth={1.6}
                className="stroke-accent"
                markerEnd={`url(#${mid}-h)`}
              />
            )}
            {[...ptr].map(([i, label]) => {
              const cx = nx(i) + nw / 2;
              const base = yy + nh + (r.cycleTo !== undefined ? 22 : 0);
              return (
                <g key={i}>
                  <path d={`M${cx} ${base + 15} L${cx} ${base + 5} M${cx - 4} ${base + 9} L${cx} ${base + 4} L${cx + 4} ${base + 9}`} fill="none" strokeWidth={1.6} className="stroke-accent-soft" />
                  <text x={cx} y={base + 27} textAnchor="middle" fontSize={11} fontWeight={700} fontFamily={MONO} className="fill-accent-soft">
                    {label}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
    </Frame>
  );
}

// ---------- grid ----------

function GridView({ d }: { d: Extract<DiagramData, { type: 'grid' }> }) {
  const all = d.cells.flat().map(fmt);
  const cw = Math.max(34, Math.min(80, 14 + Math.max(...all.map((s) => s.length), 1) * charW(13)));
  const ch = 34;
  const rows = d.cells.length;
  const cols = Math.max(...d.cells.map((r) => r.length));
  const lw = d.rowLabels ? Math.max(...d.rowLabels.map((l) => fmt(l).length)) * 7.5 + 14 : 0;
  const th = d.colLabels ? 20 : 0;
  const x0 = 8 + lw;
  const y0 = 8 + th;
  const w = x0 + cols * cw + 10;
  const h = y0 + rows * ch + 10;
  const key = (r: number, c: number) => `${r},${c}`;
  const hi = new Set((d.highlight ?? []).map(([r, c]) => key(r, c)));
  const dim = new Set((d.dim ?? []).map(([r, c]) => key(r, c)));
  const onPath = new Set((d.path ?? []).map(([r, c]) => key(r, c)));
  return (
    <Frame w={w} h={h} caption={d.caption} label="Grid">
      {d.colLabels?.map((l, c) => (
        <text key={c} x={x0 + c * cw + cw / 2} y={y0 - 7} textAnchor="middle" fontSize={11} fontFamily={MONO} className={C.muted} fontWeight={600}>
          {fmt(l)}
        </text>
      ))}
      {d.rowLabels?.map((l, r) => (
        <text key={r} x={x0 - 8} y={y0 + r * ch + ch / 2 + 4} textAnchor="end" fontSize={11} fontFamily={MONO} className={C.muted} fontWeight={600}>
          {fmt(l)}
        </text>
      ))}
      {/* Cells, then the path line, then the values on top, so the line never covers a letter. */}
      {d.cells.map((row, r) =>
        row.map((_, c) => {
          const k = key(r, c);
          const isHi = hi.has(k);
          const tint = !isHi && onPath.has(k);
          return (
            <rect
              key={k}
              x={x0 + c * cw}
              y={y0 + r * ch}
              width={cw}
              height={ch}
              opacity={dim.has(k) ? 0.35 : 1}
              strokeWidth={isHi ? 2 : 1}
              className={isHi ? C.nodeHi : tint ? 'fill-[color-mix(in_oklab,var(--color-accent)_12%,var(--color-surface))] stroke-faint/50' : 'fill-surface-2 stroke-faint/50'}
            />
          );
        }),
      )}
      {d.path && d.path.length > 1 && (
        <polyline
          points={d.path.map(([r, c]) => `${x0 + c * cw + cw / 2},${y0 + r * ch + ch / 2}`).join(' ')}
          fill="none"
          strokeWidth={ch * 0.55}
          strokeLinejoin="round"
          strokeLinecap="round"
          className="stroke-accent"
          opacity={0.22}
        />
      )}
      {d.cells.map((row, r) =>
        row.map((v, c) => {
          const k = key(r, c);
          const isHi = hi.has(k);
          return (
            <text
              key={k}
              x={x0 + c * cw + cw / 2}
              y={y0 + r * ch + ch / 2 + 4.5}
              opacity={dim.has(k) ? 0.35 : 1}
              textAnchor="middle"
              fontSize={13}
              fontFamily={MONO}
              className={C.text}
              fontWeight={isHi || onPath.has(k) ? 700 : 500}
            >
              {fmt(v)}
            </text>
          );
        }),
      )}
    </Frame>
  );
}

// ---------- buckets ----------

function BucketsView({ d }: { d: Extract<DiagramData, { type: 'buckets' }> }) {
  const mid = useId().replace(/:/g, '');
  const all = d.buckets.flat().map(fmt);
  const ew = Math.max(46, Math.min(110, 18 + Math.max(...all.map((s) => s.length), 1) * charW(13)));
  const bh = 30;
  const gap = 8;
  const bw = 34;
  const ex = 28;
  const maxChain = Math.max(1, ...d.buckets.map((b) => b.length));
  const w = 16 + bw + maxChain * (ew + ex) + 16;
  const h = 10 + d.buckets.length * (bh + gap) + 2;
  const hi = new Set((d.highlight ?? []).map(([b, i]) => `${b},${i}`));
  return (
    <Frame w={w} h={h} caption={d.caption} label="Hash table">
      <Markers id={mid} />
      {d.buckets.map((chain, b) => {
        const y = 10 + b * (bh + gap);
        return (
          <g key={b}>
            <rect x={16} y={y} width={bw} height={bh} rx={5} className="fill-surface-3 stroke-faint/60" strokeWidth={1.2} />
            <text x={16 + bw / 2} y={y + bh / 2 + 4} textAnchor="middle" fontSize={11} fontFamily={MONO} className={C.muted} fontWeight={700}>
              {b}
            </text>
            {chain.length === 0 && (
              <text x={16 + bw + 12} y={y + bh / 2 + 4} fontSize={11} fontFamily={SANS} className={C.faint}>
                empty
              </text>
            )}
            {chain.map((v, i) => {
              const x = 16 + bw + ex + i * (ew + ex);
              const isHi = hi.has(`${b},${i}`);
              return (
                <g key={i}>
                  <line x1={x - ex + 2} y1={y + bh / 2} x2={x - 3} y2={y + bh / 2} strokeWidth={1.5} className={C.edge} markerEnd={`url(#${mid}-n)`} />
                  <rect x={x} y={y} width={ew} height={bh} rx={7} strokeWidth={isHi ? 2 : 1.2} className={isHi ? C.nodeHi : C.node} />
                  <text x={x + ew / 2} y={y + bh / 2 + 4.5} textAnchor="middle" fontSize={13} fontFamily={MONO} className={C.text} fontWeight={isHi ? 700 : 500}>
                    {fmt(v)}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
    </Frame>
  );
}

// ---------- flow ----------

type FlowNode = Extract<DiagramData, { type: 'flow' }>['nodes'][number];

function FlowShape({ n, x, y, w, h }: { n: FlowNode; x: number; y: number; w: number; h: number }) {
  const cls = n.highlight ? C.nodeHi : n.kind === 'external' ? 'fill-surface stroke-faint/70' : C.node;
  const sw = n.highlight ? 2.2 : 1.4;
  switch (n.kind) {
    case 'db': {
      const e = 7;
      return (
        <g>
          <path d={`M${x} ${y + e} V${y + h - e} A${w / 2} ${e} 0 0 0 ${x + w} ${y + h - e} V${y + e}`} strokeWidth={sw} className={cls} />
          <ellipse cx={x + w / 2} cy={y + e} rx={w / 2} ry={e} strokeWidth={sw} className={cls} />
        </g>
      );
    }
    case 'queue':
      return (
        <g>
          <rect x={x} y={y} width={w} height={h} rx={6} strokeWidth={sw} className={cls} />
          {[0, 1, 2].map((i) => (
            <line key={i} x1={x + w - 10 - i * 7} y1={y + 6} x2={x + w - 10 - i * 7} y2={y + h - 6} strokeWidth={1.2} className="stroke-faint/60" />
          ))}
        </g>
      );
    case 'lb':
      return <path d={`M${x + 12} ${y} H${x + w - 12} L${x + w} ${y + h / 2} L${x + w - 12} ${y + h} H${x + 12} L${x} ${y + h / 2}Z`} strokeWidth={sw} className={cls} />;
    case 'client':
      return <rect x={x} y={y} width={w} height={h} rx={h / 2} strokeWidth={sw} className={cls} />;
    case 'cache':
      return <rect x={x} y={y} width={w} height={h} rx={10} strokeWidth={sw} className={cls} strokeDasharray="5 3" />;
    case 'external':
      return <rect x={x} y={y} width={w} height={h} rx={6} strokeWidth={sw} className={cls} strokeDasharray="3 3" />;
    default:
      return <rect x={x} y={y} width={w} height={h} rx={n.kind === 'box' ? 4 : 10} strokeWidth={sw} className={cls} />;
  }
}

const KIND_TAG: Partial<Record<NonNullable<FlowNode['kind']>, string>> = { db: 'database', cache: 'cache', queue: 'queue', lb: 'load balancer', external: 'external' };

function FlowView({ d }: { d: Extract<DiagramData, { type: 'flow' }> }) {
  const mid = useId().replace(/:/g, '');
  const bw = Math.max(124, Math.min(190, 24 + Math.max(...d.nodes.map((n) => Math.max(n.label.length * 7.2, (n.sub ?? '').length * 6)))));
  const bh = 50;
  const gx = 70;
  const gy = 22;
  const cols = new Map<number, FlowNode[]>();
  for (const n of d.nodes) cols.set(n.col, [...(cols.get(n.col) ?? []), n]);
  for (const list of cols.values()) list.sort((a, b) => (a.row ?? d.nodes.indexOf(a)) - (b.row ?? d.nodes.indexOf(b)));
  const colIdx = [...cols.keys()].sort((a, b) => a - b);
  const tallest = Math.max(...[...cols.values()].map((l) => l.length));
  const colH = tallest * bh + (tallest - 1) * gy;
  const pad = 16;
  const pos = new Map<string, { x: number; y: number }>();
  colIdx.forEach((c, ci) => {
    const list = cols.get(c)!;
    const hgt = list.length * bh + (list.length - 1) * gy;
    list.forEach((n, ri) => pos.set(n.id, { x: pad + ci * (bw + gx), y: pad + 14 + (colH - hgt) / 2 + ri * (bh + gy) }));
  });
  const w = pad * 2 + colIdx.length * bw + (colIdx.length - 1) * gx;
  const h = pad * 2 + colH + 28;
  return (
    <Frame w={w} h={h} caption={d.caption} label="Architecture diagram">
      <Markers id={mid} />
      {d.edges.map((e, i) => {
        const a = pos.get(e.from)!;
        const b = pos.get(e.to)!;
        let path: string;
        let lx: number;
        let ly: number;
        if (Math.abs(a.x - b.x) < 1) {
          // Same column: straight down/up between the boxes.
          const down = b.y > a.y;
          const y1 = down ? a.y + bh : a.y;
          const y2 = down ? b.y - 2 : b.y + bh + 2;
          path = `M${a.x + bw / 2} ${y1} L${b.x + bw / 2} ${y2}`;
          lx = a.x + bw / 2 + 6;
          ly = (y1 + y2) / 2 + 4;
        } else {
          const fwd = b.x > a.x;
          const x1 = fwd ? a.x + bw : a.x;
          const x2 = fwd ? b.x - 2 : b.x + bw + 2;
          const y1 = a.y + bh / 2;
          const y2 = b.y + bh / 2;
          const k = (x2 - x1) / 2;
          path = `M${x1} ${y1} C ${x1 + k} ${y1}, ${x2 - k} ${y2}, ${x2} ${y2}`;
          lx = (x1 + x2) / 2;
          ly = (y1 + y2) / 2 - 6;
        }
        const hiEdge = d.nodes.find((n) => n.id === e.to)?.highlight && d.nodes.find((n) => n.id === e.from)?.highlight;
        return (
          <g key={i}>
            <path
              d={path}
              fill="none"
              strokeWidth={hiEdge ? 2.2 : 1.5}
              className={hiEdge ? C.edgeHi : C.edge}
              strokeDasharray={e.dashed ? '5 4' : undefined}
              markerEnd={`url(#${mid}-${hiEdge ? 'h' : 'n'})`}
              markerStart={e.both ? `url(#${mid}-${hiEdge ? 'h' : 'n'})` : undefined}
            />
            {e.label && (
              <text x={lx} y={ly} textAnchor={Math.abs(a.x - b.x) < 1 ? 'start' : 'middle'} fontSize={10.5} fontFamily={SANS} className={C.muted} style={{ paintOrder: 'stroke' }} strokeWidth={4} stroke="var(--color-surface)">
                {e.label}
              </text>
            )}
          </g>
        );
      })}
      {d.nodes.map((n) => {
        const p = pos.get(n.id)!;
        const tag = n.kind ? KIND_TAG[n.kind] : undefined;
        const sub = n.sub ?? (tag && !n.label.toLowerCase().includes(tag.split(' ').pop()!) ? tag : undefined);
        return (
          <g key={n.id}>
            <FlowShape n={n} x={p.x} y={p.y} w={bw} h={bh} />
            <text x={p.x + bw / 2} y={p.y + (sub ? bh / 2 : bh / 2 + 4.5)} textAnchor="middle" fontSize={12.5} fontFamily={SANS} className={C.text} fontWeight={650}>
              {n.label}
            </text>
            {sub && (
              <text x={p.x + bw / 2} y={p.y + bh / 2 + 14} textAnchor="middle" fontSize={10.5} fontFamily={SANS} className={C.muted}>
                {sub}
              </text>
            )}
          </g>
        );
      })}
    </Frame>
  );
}

// ---------- complexity ----------

const CURVES: Record<string, { f: (n: number) => number; color: string }> = {
  '1': { f: () => 1, color: 'stroke-good' },
  'log n': { f: (n) => Math.log2(Math.max(n, 1)), color: 'stroke-good' },
  n: { f: (n) => n, color: 'stroke-info' },
  'n log n': { f: (n) => n * Math.log2(Math.max(n, 1)), color: 'stroke-accent' },
  'n^2': { f: (n) => n * n, color: 'stroke-warn' },
  '2^n': { f: (n) => 2 ** n, color: 'stroke-bad' },
  'n!': { f: (n) => { let r = 1; for (let i = 2; i <= Math.floor(n); i++) r *= i; return r * (n - Math.floor(n) + 1); }, color: 'stroke-bad' },
};
const LABEL_FILL: Record<string, string> = { 'stroke-good': 'fill-good', 'stroke-info': 'fill-info', 'stroke-accent': 'fill-accent-soft', 'stroke-warn': 'fill-warn', 'stroke-bad': 'fill-bad' };

function ComplexityView({ d }: { d: Extract<DiagramData, { type: 'complexity' }> }) {
  const W = 520;
  const H = 300;
  const L = 44;
  const B = 34;
  const T = 14;
  const R = 70;
  const maxN = 16;
  const maxY = 64;
  const px = (n: number) => L + (n / maxN) * (W - L - R);
  const py = (v: number) => H - B - (Math.min(v, maxY) / maxY) * (H - B - T);
  const hi = new Set(d.highlight ?? []);
  const placed: number[] = [];
  return (
    <Frame w={W} h={H} caption={d.caption} label="Growth of common complexities">
      <line x1={L} y1={H - B} x2={W - R + 6} y2={H - B} strokeWidth={1.2} className="stroke-faint" />
      <line x1={L} y1={H - B} x2={L} y2={T - 4} strokeWidth={1.2} className="stroke-faint" />
      <text x={(L + W - R) / 2} y={H - 8} textAnchor="middle" fontSize={11} fontFamily={SANS} className={C.muted}>
        input size n →
      </text>
      <text x={14} y={(H - B + T) / 2} textAnchor="middle" fontSize={11} fontFamily={SANS} className={C.muted} transform={`rotate(-90 14 ${(H - B + T) / 2})`}>
        operations →
      </text>
      {d.curves.map((name) => {
        const c = CURVES[name];
        const pts: string[] = [];
        let end = { x: px(maxN), y: py(c.f(maxN)) };
        for (let n = 0.5; n <= maxN + 1e-9; n += 0.125) {
          const v = c.f(n);
          pts.push(`${px(n).toFixed(1)},${py(v).toFixed(1)}`);
          if (v >= maxY) {
            end = { x: px(n), y: py(maxY) };
            break;
          }
        }
        const isHi = hi.has(name);
        // Labels: at the curve's end, nudged so they don't overlap.
        let ly = end.y + (end.y <= T + 2 ? 12 : 4);
        while (placed.some((p) => Math.abs(p - ly) < 12 && end.x > W - R - 10)) ly += 12;
        placed.push(ly);
        return (
          <g key={name} opacity={hi.size && !isHi ? 0.45 : 1}>
            <polyline points={pts.join(' ')} fill="none" strokeWidth={isHi ? 3.2 : 2} strokeLinecap="round" strokeLinejoin="round" className={c.color} />
            <text x={Math.min(end.x + 6, W - R + 8)} y={ly} fontSize={11.5} fontWeight={700} fontFamily={MONO} className={LABEL_FILL[c.color]}>
              {name === '1' ? 'O(1)' : `O(${name})`}
            </text>
          </g>
        );
      })}
    </Frame>
  );
}

// ---------- entry ----------

export function DiagramView({ diagram }: { diagram: DiagramData }) {
  switch (diagram.type) {
    case 'tree':
      return <TreeView d={diagram} />;
    case 'graph':
      return <GraphView d={diagram} />;
    case 'array':
      return <ArrayView d={diagram} />;
    case 'list':
      return <ListView d={diagram} />;
    case 'grid':
      return <GridView d={diagram} />;
    case 'buckets':
      return <BucketsView d={diagram} />;
    case 'flow':
      return <FlowView d={diagram} />;
    case 'complexity':
      return <ComplexityView d={diagram} />;
  }
}

/** A ```diagram fence: parsed and drawn, or a quiet note if it can't be. */
export function DiagramFence({ source }: { source: string }) {
  const r = parseDiagram(source);
  if (!r.ok) {
    return (
      <p className="my-4 rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs text-faint" title={r.error}>
        (diagram unavailable)
      </p>
    );
  }
  return <DiagramView diagram={r.diagram} />;
}
