export type Transaction = "T1" | "T2" | "T3";
export type Item = "X" | "Y";
export interface Operation {
  id: number;
  transaction: Transaction;
  kind: "r" | "w";
  item: Item;
}
export interface GraphEdge {
  from: Transaction;
  to: Transaction;
  conflicts: string[];
}
export interface LockState {
  owners: Partial<Record<Item, Transaction>>;
  waiting: { transaction: Transaction; item: Item }[];
}
const transactions: Transaction[] = ["T1", "T2", "T3"];
function graph(edges: GraphEdge[], nodes: Transaction[]) {
  const visited = new Set<Transaction>(),
    stack: Transaction[] = [],
    order: Transaction[] = [];
  let cycle: Transaction[] = [];
  const visit = (node: Transaction): void => {
    if (stack.includes(node)) {
      if (!cycle.length) cycle = [...stack.slice(stack.indexOf(node)), node];
      return;
    }
    if (visited.has(node)) return;
    visited.add(node);
    stack.push(node);
    edges.filter((e) => e.from === node).forEach((e) => visit(e.to));
    stack.pop();
    order.unshift(node);
  };
  nodes.forEach(visit);
  return { cycle, order: cycle.length ? [] : order };
}
function addEdge(
  edges: GraphEdge[],
  from: Transaction,
  to: Transaction,
  reason: string,
) {
  const edge = edges.find((e) => e.from === from && e.to === to);
  if (edge) edge.conflicts.push(reason);
  else edges.push({ from, to, conflicts: [reason] });
}
export function analyzeSchedule(ops: Operation[]) {
  const edges: GraphEdge[] = [];
  ops.forEach((a, i) =>
    ops.slice(i + 1).forEach((b, j) => {
      if (
        a.transaction !== b.transaction &&
        a.item === b.item &&
        (a.kind === "w" || b.kind === "w")
      ) {
        addEdge(
          edges,
          a.transaction,
          b.transaction,
          `Step ${i + 1} ${a.kind}(${a.item}) precedes step ${i + j + 2} ${b.kind}(${b.item}).`,
        );
      }
    }),
  );
  const result = graph(
    edges,
    transactions.filter((t) => ops.some((op) => op.transaction === t)),
  );
  return { edges, ...result, serializable: result.cycle.length === 0 };
}
export function analyzeLocks(locks: LockState) {
  const edges: GraphEdge[] = [];
  locks.waiting.forEach((w) => {
    const owner = locks.owners[w.item];
    if (owner && owner !== w.transaction)
      addEdge(
        edges,
        w.transaction,
        owner,
        `${w.transaction} waits for ${w.item}, held by ${owner}.`,
      );
  });
  return { edges, ...graph(edges, transactions) };
}
export function requestLock(
  locks: LockState,
  transaction: Transaction,
  item: Item,
): LockState {
  const state = structuredClone(locks);
  if (!state.owners[item]) state.owners[item] = transaction;
  else if (
    state.owners[item] !== transaction &&
    !state.waiting.some((w) => w.transaction === transaction && w.item === item)
  )
    state.waiting.push({ transaction, item });
  return state;
}
export function releaseLock(
  locks: LockState,
  transaction: Transaction,
): LockState {
  const state = structuredClone(locks);
  state.waiting = state.waiting.filter((w) => w.transaction !== transaction);
  (["X", "Y"] as Item[]).forEach((item) => {
    if (state.owners[item] !== transaction) return;
    delete state.owners[item];
    const first = state.waiting.findIndex((w) => w.item === item);
    if (first >= 0) {
      state.owners[item] = state.waiting[first].transaction;
      state.waiting.splice(first, 1);
    }
  });
  return state;
}
