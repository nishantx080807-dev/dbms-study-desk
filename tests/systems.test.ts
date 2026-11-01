import test from "node:test";
import assert from "node:assert/strict";
import { BPlusTree, validateTree } from "../src/widgets/tree-engine.ts";
import {
  analyzeSchedule,
  analyzeLocks,
  requestLock,
  releaseLock,
  type LockState,
} from "../src/widgets/schedule-engine.ts";

test("order-4 B+ tree preserves occupancy, separators and linked leaves through arbitrary inserts and deletes", () => {
  const tree = new BPlusTree();
  const expected = new Set<number>();
  // A reproducible permutation exercises both directions of borrowing and merging.
  const keys = Array.from({ length: 100 }, (_, i) => (i * 37) % 100);
  for (const key of keys) {
    tree.insert(key);
    expected.add(key);
    assert.deepEqual(validateTree(tree.root), []);
    assert.deepEqual(
      tree.values(),
      [...expected].sort((a, b) => a - b),
    );
  }
  tree.insert(50);
  assert.equal(tree.values().length, 100);
  for (const key of [...keys].reverse()) {
    tree.delete(key);
    expected.delete(key);
    assert.deepEqual(validateTree(tree.root), []);
    assert.deepEqual(
      tree.values(),
      [...expected].sort((a, b) => a - b),
    );
  }
  assert.equal(tree.root.leaf, true);
  assert.deepEqual(tree.delete(999).at(-1)?.message, "999 is not present.");
});

test("B+ tree traces describe structural splits and merges and snapshots are independent", () => {
  const tree = new BPlusTree();
  for (const n of [10, 20, 30]) tree.insert(n);
  const steps = tree.insert(40);
  assert.ok(steps.some((s) => s.kind === "split"));
  assert.deepEqual(steps[0].root.keys, [10, 20, 30]);
  const deletion = tree.delete(10);
  assert.deepEqual(steps[0].root.keys, [10, 20, 30]);
  assert.ok(deletion.some((s) => s.kind === "merge"));
});

test("mixed tree updates preserve every surviving key including negative values", () => {
  const tree = new BPlusTree(),
    expected = new Set<number>();
  let random = 123456;
  for (let i = 0; i < 1200; i++) {
    random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
    const key = (random % 151) - 75;
    if ((random >>> 16) % 3) {
      tree.insert(key);
      expected.add(key);
    } else {
      tree.delete(key);
      expected.delete(key);
    }
    assert.deepEqual(validateTree(tree.root), []);
    assert.deepEqual(
      tree.values(),
      [...expected].sort((a, b) => a - b),
    );
  }
});

test("a corrupted leaf chain is detected independently of stored keys", () => {
  const tree = new BPlusTree();
  [1, 2, 3, 4, 5].forEach((n) => tree.insert(n));
  tree.root.children[0].next = undefined;
  assert.ok(validateTree(tree.root).includes("Broken leaf chain."));
});

test("precedence graph uses only conflicting operations and gives a topological order", () => {
  const result = analyzeSchedule([
    { id: 1, transaction: "T1", kind: "r", item: "X" },
    { id: 2, transaction: "T2", kind: "r", item: "X" },
    { id: 3, transaction: "T2", kind: "w", item: "X" },
    { id: 4, transaction: "T3", kind: "w", item: "Y" },
  ]);
  assert.equal(result.serializable, true);
  assert.deepEqual(
    result.edges.map((e) => [e.from, e.to]),
    [["T1", "T2"]],
  );
  assert.ok(result.order.indexOf("T1") < result.order.indexOf("T2"));
  assert.equal(result.edges[0].conflicts.length, 1);
});

test("precedence graph detects a cycle and ignores same-transaction pairs", () => {
  const result = analyzeSchedule([
    { id: 1, transaction: "T1", kind: "w", item: "X" },
    { id: 2, transaction: "T2", kind: "r", item: "X" },
    { id: 3, transaction: "T2", kind: "w", item: "Y" },
    { id: 4, transaction: "T1", kind: "r", item: "Y" },
  ]);
  assert.equal(result.serializable, false);
  assert.equal(result.cycle.length, 3);
  assert.deepEqual(result.order, []);
});

test("exclusive locks form wait-for edges and releasing an owner grants the oldest waiter", () => {
  let locks: LockState = { owners: {}, waiting: [] };
  locks = requestLock(locks, "T1", "X");
  locks = requestLock(locks, "T2", "Y");
  locks = requestLock(locks, "T1", "Y");
  locks = requestLock(locks, "T2", "X");
  assert.equal(analyzeLocks(locks).cycle.length, 3);
  locks = releaseLock(locks, "T2");
  assert.deepEqual(locks.owners, { X: "T1", Y: "T1" });
  assert.deepEqual(analyzeLocks(locks).cycle, []);
});

test("repeated lock requests are idempotent and grants preserve queue order", () => {
  let locks: LockState = { owners: { X: "T1" }, waiting: [] };
  locks = requestLock(locks, "T2", "X");
  locks = requestLock(locks, "T2", "X");
  locks = requestLock(locks, "T3", "X");
  assert.equal(locks.waiting.length, 2);
  const released = releaseLock(locks, "T1");
  assert.equal(released.owners.X, "T2");
  assert.deepEqual(released.waiting, [{ transaction: "T3", item: "X" }]);
  assert.deepEqual(
    analyzeLocks(released).edges.map((e) => [e.from, e.to]),
    [["T3", "T2"]],
  );
  assert.equal(locks.owners.X, "T1");
});
