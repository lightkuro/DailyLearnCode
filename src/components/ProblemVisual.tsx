import type { ReactNode } from 'react';
import type { Problem } from '../content/schema';
import { checkSvg, svgDataUrl } from '../content/svg';
import type { ValueType } from '../runner/harness/types';

/**
 * Themed picture for a problem. Generated SVGs are shown through <img> (no script can run, no
 * external loads). When a problem has none, a small diagram of Example 1 is drawn from the data.
 */
export function ProblemVisual({ problem }: { problem: Problem }) {
  const ill = problem.illustration;
  if (ill && checkSvg(ill.svg).length === 0) {
    return (
      <figure className="mx-auto mb-5 max-w-[560px]">
        <img src={svgDataUrl(ill.svg)} alt={ill.caption ?? `Illustration for ${problem.title}`} className="w-full rounded-xl" draggable={false} />
        {ill.caption && <figcaption className="mt-1.5 text-center text-xs text-faint">{ill.caption}</figcaption>}
      </figure>
    );
  }
  const auto = autoVisual(problem);
  if (!auto) return null;
  return (
    <figure className="mx-auto mb-5 max-w-[560px] rounded-xl border border-line bg-code p-3">
      {auto}
      <figcaption className="mt-1.5 text-center text-xs text-faint">Example 1</figcaption>
    </figure>
  );
}

const W = 520;

function autoVisual(problem: Problem): ReactNode {
  const ex = problem.examples[0];
  if (!ex) return null;
  const idx = problem.signature.params.findIndex((p) => isDrawable(p.type, ex.args[problem.signature.params.indexOf(p)]));
  if (idx === -1) return null;
  const { type, name } = problem.signature.params[idx];
  const v = ex.args[idx];
  if (type === 'ListNode' && Array.isArray(v)) return chain(v as number[], name);
  if (type === 'TreeNode' && Array.isArray(v)) return tree(v as (number | null)[]);
  if ((type === 'char[][]' || type === 'int[][]' || type === 'string[][]') && Array.isArray(v)) return grid(v as unknown[][]);
  if (type === 'string' && typeof v === 'string') return tiles([...v], name);
  if (Array.isArray(v)) return tiles(v as unknown[], name);
  return null;
}

function isDrawable(t: ValueType, v: unknown): boolean {
  if (t === 'ListNode' || t === 'TreeNode') return Array.isArray(v) && v.length > 0 && v.length <= 31;
  if (t.endsWith('[][]')) return Array.isArray(v) && v.length > 0 && v.length <= 10 && Array.isArray(v[0]) && (v[0] as unknown[]).length <= 12;
  if (t === 'string') return typeof v === 'string' && v.length > 0 && v.length <= 16;
  if (t.endsWith('[]') || t.startsWith('list<')) return Array.isArray(v) && v.length > 0 && v.length <= 14 && v.every((x) => typeof x !== 'object');
  return false;
}

function label(v: unknown): string {
  return typeof v === 'string' ? v : String(v);
}

function tiles(values: unknown[], name: string) {
  const n = values.length;
  const size = Math.min(52, (W - 20) / n - 6);
  const startX = (W - n * (size + 6) + 6) / 2;
  return (
    <svg viewBox={`0 0 ${W} ${size + 44}`} className="w-full" role="img" aria-label={`${name} = ${JSON.stringify(values)}`}>
      <text x={W / 2} y={14} textAnchor="middle" style={{ fill: "var(--color-muted)" }} fontSize="12" fontFamily="ui-monospace, monospace">
        {name}
      </text>
      {values.map((v, i) => (
        <g key={i} transform={`translate(${startX + i * (size + 6)}, 22)`}>
          <rect width={size} height={size} rx={10} style={{ fill: "var(--color-surface-2)", stroke: "var(--color-accent)" }} strokeOpacity={0.7} strokeWidth={1.5} />
          <text x={size / 2} y={size / 2 + 5} textAnchor="middle" style={{ fill: "var(--color-ink)" }} fontSize={Math.min(16, size / 2.4)} fontFamily="ui-monospace, monospace">
            {label(v).slice(0, 6)}
          </text>
          <text x={size / 2} y={size + 14} textAnchor="middle" style={{ fill: "var(--color-faint)" }} fontSize="10" fontFamily="ui-monospace, monospace">
            {i}
          </text>
        </g>
      ))}
    </svg>
  );
}

function chain(values: number[], name: string) {
  const n = values.length;
  const box = Math.min(54, (W - 20) / n - 22);
  const gap = 22;
  const startX = (W - n * (box + gap) + gap) / 2;
  return (
    <svg viewBox={`0 0 ${W} ${box + 36}`} className="w-full" role="img" aria-label={`${name}: ${values.join(' → ')}`}>
      {values.map((v, i) => {
        const x = startX + i * (box + gap);
        return (
          <g key={i}>
            <rect x={x} y={14} width={box} height={box * 0.72} rx={9} style={{ fill: "var(--color-surface-2)", stroke: "var(--color-accent)" }} strokeWidth={1.5} />
            <text x={x + box / 2} y={14 + box * 0.36 + 5} textAnchor="middle" style={{ fill: "var(--color-ink)" }} fontSize="14" fontFamily="ui-monospace, monospace">
              {v}
            </text>
            {i < n - 1 && (
              <path d={`M${x + box + 3} ${14 + box * 0.36} h${gap - 8} m-5 -4 l5 4 l-5 4`} style={{ stroke: "var(--color-muted)" }} strokeWidth={1.5} fill="none" />
            )}
          </g>
        );
      })}
    </svg>
  );
}

function grid(rows: unknown[][]) {
  const r = rows.length;
  const c = Math.max(...rows.map((row) => row.length));
  const cell = Math.min(40, (W - 40) / c, 260 / r);
  const startX = (W - c * cell) / 2;
  const nums = rows.flat().filter((x): x is number => typeof x === 'number');
  const lo = Math.min(...nums);
  const hi = Math.max(...nums);
  const fill = (v: unknown): string => {
    if (v === '1' || v === 'X' || v === '#') return 'var(--color-good)';
    if (v === '0' || v === '.' || v === 'O') return 'color-mix(in oklab, var(--color-accent) 22%, var(--color-surface-2))';
    if (typeof v === 'number' && hi > lo) return `color-mix(in oklab, var(--color-accent) ${Math.round(15 + ((v - lo) / (hi - lo)) * 70)}%, var(--color-surface-2))`;
    return 'var(--color-surface-2)';
  };
  return (
    <svg viewBox={`0 0 ${W} ${r * cell + 12}`} className="w-full" role="img" aria-label="grid">
      {rows.map((row, i) =>
        row.map((v, j) => (
          <g key={`${i}-${j}`}>
            <rect x={startX + j * cell + 1.5} y={6 + i * cell + 1.5} width={cell - 3} height={cell - 3} rx={6} style={{ fill: fill(v) }} />
            <text x={startX + j * cell + cell / 2} y={6 + i * cell + cell / 2 + 4} textAnchor="middle" style={{ fill: "var(--color-ink)" }} fontSize="12" fontFamily="ui-monospace, monospace">
              {label(v)}
            </text>
          </g>
        )),
      )}
    </svg>
  );
}

function tree(level: (number | null)[]) {
  interface N {
    v: number;
    depth: number;
    pos: number;
    left?: N;
    right?: N;
  }
  if (level[0] === null || level[0] === undefined) return null;
  const root: N = { v: level[0], depth: 0, pos: 0 };
  const q: N[] = [root];
  let i = 1;
  let maxDepth = 0;
  while (i < level.length && q.length) {
    const n = q.shift()!;
    for (const side of ['left', 'right'] as const) {
      const v = level[i++];
      if (v !== null && v !== undefined) {
        const child: N = { v, depth: n.depth + 1, pos: n.pos * 2 + (side === 'right' ? 1 : 0) };
        n[side] = child;
        q.push(child);
        maxDepth = Math.max(maxDepth, child.depth);
      }
    }
  }
  const h = (maxDepth + 1) * 54 + 10;
  const xy = (n: N) => ({ x: ((n.pos + 0.5) / 2 ** n.depth) * W, y: 26 + n.depth * 54 });
  const nodes: N[] = [];
  const walk = (n?: N) => {
    if (!n) return;
    nodes.push(n);
    walk(n.left);
    walk(n.right);
  };
  walk(root);
  return (
    <svg viewBox={`0 0 ${W} ${h}`} className="w-full" role="img" aria-label="binary tree">
      {nodes.flatMap((n) =>
        [n.left, n.right]
          .filter((c): c is N => !!c)
          .map((c) => {
            const a = xy(n);
            const b = xy(c);
            return <line key={`${n.depth}-${n.pos}-${c.pos}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} style={{ stroke: "var(--color-line)" }} strokeWidth={1.5} />;
          }),
      )}
      {nodes.map((n) => {
        const { x, y } = xy(n);
        return (
          <g key={`${n.depth}-${n.pos}`}>
            <circle cx={x} cy={y} r={15} style={{ fill: "var(--color-surface-2)", stroke: "var(--color-accent)" }} strokeWidth={1.8} />
            <text x={x} y={y + 4.5} textAnchor="middle" style={{ fill: "var(--color-ink)" }} fontSize="13" fontFamily="ui-monospace, monospace">
              {n.v}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
