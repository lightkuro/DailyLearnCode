import { z } from 'zod';

/**
 * Pictures for Learn pages (and Detective design cases), written as JSON in a ```diagram fence and
 * drawn as themed SVG by components/Diagram.tsx. Small on purpose: a handful of shapes that cover
 * trees, graphs, arrays, lists, grids, hash tables, architecture boxes and growth curves.
 */
const Label = z.union([z.string(), z.number()]);
const caption = z.string().max(200).optional();

const ArrayRow = z.object({
  /** Shown left of the row (e.g. "i = 2", "after"). */
  label: z.string().max(24).optional(),
  values: z.array(Label).min(1).max(24),
  /** Indices drawn in the accent colour. */
  highlight: z.array(z.number().int().min(0)).optional(),
  /** Indices drawn faded (e.g. already processed / discarded). */
  dim: z.array(z.number().int().min(0)).optional(),
  /** Labelled arrows under cells, e.g. {"L": 0, "R": 5}. */
  pointers: z.record(z.string().max(8), z.number().int().min(0)).optional(),
  /** A bracket around cells lo..hi (inclusive), e.g. a sliding window. */
  window: z.tuple([z.number().int().min(0), z.number().int().min(0)]).optional(),
});

const ListRow = ArrayRow.omit({ window: true }).extend({
  /** The last node's next pointer goes back to this index (a cycle). */
  cycleTo: z.number().int().min(0).optional(),
});

export const DiagramSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('tree'),
    /** Level order, LeetCode style: null = no node (children of a missing node are skipped). */
    values: z.array(z.union([Label, z.null()])).min(1).max(31),
    /** Node values drawn in the accent colour. */
    highlight: z.array(Label).optional(),
    /** Visit order: badges 1, 2, 3… on these node values. */
    order: z.array(Label).optional(),
    /** Small notes under nodes, by value (e.g. heights, subtree sums). */
    notes: z.record(z.string(), z.string().max(12)).optional(),
    caption,
  }),
  z.object({
    type: z.literal('graph'),
    /** Node names, or {id, x, y} to place them by hand (any units; they're scaled to fit). */
    nodes: z.array(z.union([z.string().max(10), z.object({ id: z.string().max(10), x: z.number(), y: z.number() })])).min(1).max(16),
    /** [from, to] or [from, to, weight]. */
    edges: z.array(z.union([z.tuple([z.string(), z.string()]), z.tuple([z.string(), z.string(), Label])])).max(40),
    directed: z.boolean().optional(),
    /** circle (default without coordinates) or layers: BFS layers from the first node, left to right. */
    layout: z.enum(['circle', 'layers']).optional(),
    highlight: z.array(z.string()).optional(),
    /** A walk through these nodes: its edges are drawn in the accent colour. */
    path: z.array(z.string()).optional(),
    order: z.array(z.string()).optional(),
    /** Small notes next to nodes (e.g. distances). */
    notes: z.record(z.string(), z.string().max(12)).optional(),
    caption,
  }),
  z.object({
    type: z.literal('array'),
    /** One row, or `rows` for several (before/after, step by step). */
    values: z.array(Label).min(1).max(24).optional(),
    highlight: z.array(z.number().int().min(0)).optional(),
    dim: z.array(z.number().int().min(0)).optional(),
    pointers: z.record(z.string().max(8), z.number().int().min(0)).optional(),
    window: z.tuple([z.number().int().min(0), z.number().int().min(0)]).optional(),
    rows: z.array(ArrayRow).min(1).max(8).optional(),
    /** Show index numbers above the first row (default true). */
    indices: z.boolean().optional(),
    /** Draw as a vertical stack: the last value is the top (values in push order). Single row only. */
    vertical: z.boolean().optional(),
    caption,
  }),
  z.object({
    type: z.literal('list'),
    values: z.array(Label).min(1).max(12).optional(),
    highlight: z.array(z.number().int().min(0)).optional(),
    dim: z.array(z.number().int().min(0)).optional(),
    pointers: z.record(z.string().max(8), z.number().int().min(0)).optional(),
    cycleTo: z.number().int().min(0).optional(),
    rows: z.array(ListRow).min(1).max(6).optional(),
    caption,
  }),
  z.object({
    type: z.literal('grid'),
    /** Rows of cells ("" = empty). */
    cells: z.array(z.array(Label).min(1).max(16)).min(1).max(12),
    highlight: z.array(z.tuple([z.number().int().min(0), z.number().int().min(0)])).optional(),
    dim: z.array(z.tuple([z.number().int().min(0), z.number().int().min(0)])).optional(),
    /** A line through these cells, in order. */
    path: z.array(z.tuple([z.number().int().min(0), z.number().int().min(0)])).optional(),
    rowLabels: z.array(Label).optional(),
    colLabels: z.array(Label).optional(),
    caption,
  }),
  z.object({
    type: z.literal('buckets'),
    /** A hash table: bucket i holds a chain of entries. */
    buckets: z.array(z.array(Label).max(5)).min(1).max(10),
    /** [bucket, position] entries drawn in the accent colour. */
    highlight: z.array(z.tuple([z.number().int().min(0), z.number().int().min(0)])).optional(),
    caption,
  }),
  z.object({
    type: z.literal('flow'),
    /** Boxes in columns (left → right); `row` orders them inside a column. */
    nodes: z
      .array(
        z.object({
          id: z.string().max(24),
          label: z.string().max(28),
          sub: z.string().max(32).optional(),
          kind: z.enum(['client', 'service', 'db', 'cache', 'queue', 'lb', 'external', 'box']).optional(),
          col: z.number().int().min(0).max(6),
          row: z.number().min(0).max(6).optional(),
          highlight: z.boolean().optional(),
        }),
      )
      .min(1)
      .max(14),
    edges: z
      .array(
        z.object({
          from: z.string(),
          to: z.string(),
          label: z.string().max(24).optional(),
          dashed: z.boolean().optional(),
          both: z.boolean().optional(),
        }),
      )
      .max(24),
    caption,
  }),
  z.object({
    type: z.literal('complexity'),
    /** Growth curves to plot, slowest first. */
    curves: z.array(z.enum(['1', 'log n', 'n', 'n log n', 'n^2', '2^n', 'n!'])).min(1).max(7),
    highlight: z.array(z.string()).optional(),
    caption,
  }),
]);
export type Diagram = z.infer<typeof DiagramSchema>;

/** Checks beyond the schema (indices in range, edges between known nodes…). */
export function diagramProblems(d: Diagram): string[] {
  const errs: string[] = [];
  const inRange = (xs: number[] | undefined, n: number, what: string) => xs?.forEach((i) => i >= n && errs.push(`${what} index ${i} is out of range (${n} items)`));
  if (d.type === 'array' || d.type === 'list') {
    if (!d.values === !d.rows) errs.push(`${d.type}: give either values or rows`);
    const rows = d.rows ?? [{ ...d, values: d.values ?? [] }];
    for (const r of rows) {
      inRange(r.highlight, r.values.length, 'highlight');
      inRange(r.dim, r.values.length, 'dim');
      inRange(Object.values(r.pointers ?? {}), r.values.length, 'pointer');
      if ('window' in r && r.window && (r.window[0] > r.window[1] || r.window[1] >= r.values.length)) errs.push('window out of range');
      if ('cycleTo' in r && r.cycleTo !== undefined && r.cycleTo >= r.values.length) errs.push('cycleTo out of range');
    }
    if (d.type === 'array' && d.vertical && d.rows && d.rows.length > 1) errs.push('vertical arrays have one row');
  }
  if (d.type === 'tree') {
    const vals = new Set(d.values.filter((v) => v !== null).map(String));
    for (const v of [...(d.highlight ?? []), ...(d.order ?? []), ...Object.keys(d.notes ?? {})]) if (!vals.has(String(v))) errs.push(`tree has no node ${v}`);
    if (d.values[0] === null) errs.push('tree root is null');
  }
  if (d.type === 'graph') {
    const ids = new Set(d.nodes.map((n) => (typeof n === 'string' ? n : n.id)));
    if (ids.size !== d.nodes.length) errs.push('duplicate graph node');
    for (const e of d.edges) for (const x of [e[0], e[1]]) if (!ids.has(x)) errs.push(`edge uses unknown node ${x}`);
    for (const x of [...(d.highlight ?? []), ...(d.path ?? []), ...(d.order ?? []), ...Object.keys(d.notes ?? {})]) if (!ids.has(x)) errs.push(`unknown node ${x}`);
    const placed = d.nodes.filter((n) => typeof n !== 'string').length;
    if (placed && placed !== d.nodes.length) errs.push('give coordinates for all graph nodes or none');
  }
  if (d.type === 'grid') {
    const h = d.cells.length;
    const w = Math.max(...d.cells.map((r) => r.length));
    for (const [r, c] of [...(d.highlight ?? []), ...(d.dim ?? []), ...(d.path ?? [])]) if (r >= h || c >= w) errs.push(`cell [${r},${c}] is outside the grid`);
    if (d.rowLabels && d.rowLabels.length !== h) errs.push('rowLabels length must match the rows');
    if (d.colLabels && d.colLabels.length !== w) errs.push('colLabels length must match the columns');
  }
  if (d.type === 'buckets') for (const [b, i] of d.highlight ?? []) if (b >= d.buckets.length || i >= d.buckets[b].length) errs.push(`bucket entry [${b},${i}] doesn't exist`);
  if (d.type === 'flow') {
    const ids = new Set(d.nodes.map((n) => n.id));
    if (ids.size !== d.nodes.length) errs.push('duplicate flow node id');
    for (const e of d.edges) for (const x of [e.from, e.to]) if (!ids.has(x)) errs.push(`flow edge uses unknown node ${x}`);
  }
  return errs;
}

/** Parse a ```diagram fence: the diagram, or the reason it can't be drawn. */
export function parseDiagram(src: string): { ok: true; diagram: Diagram } | { ok: false; error: string } {
  let json: unknown;
  try {
    json = JSON.parse(src);
  } catch (e) {
    return { ok: false, error: `not valid JSON: ${(e as Error).message}` };
  }
  const r = DiagramSchema.safeParse(json);
  if (!r.success) return { ok: false, error: r.error.issues.map((i) => `${i.path.join('.') || 'diagram'}: ${i.message}`).join('; ') };
  const extra = diagramProblems(r.data);
  return extra.length ? { ok: false, error: extra.join('; ') } : { ok: true, diagram: r.data };
}
