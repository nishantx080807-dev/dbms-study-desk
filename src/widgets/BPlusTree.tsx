import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BPlusTree as Tree, type TreeNode, type TreeStep } from "./tree-engine";
import "./systems.css";

function seed() {
  const tree = new Tree();
  [10, 20, 5, 6, 12, 30, 7, 17].forEach((key) => tree.insert(key));
  return tree;
}

function layout(root: TreeNode) {
  const nodes: { node: TreeNode; x: number; y: number }[] = [];
  let leaf = 0,
    depth = 0;
  const visit = (node: TreeNode, level: number): number => {
    depth = Math.max(depth, level);
    const x = node.leaf
      ? 75 + leaf++ * 150
      : node.children
          .map((child) => visit(child, level + 1))
          .reduce((a, b) => a + b, 0) / node.children.length;
    nodes.push({ node, x, y: 45 + level * 105 });
    return x;
  };
  visit(root, 0);
  return { nodes, width: Math.max(450, leaf * 150), height: 120 + depth * 105 };
}

export default function BPlusTree() {
  const [tree] = useState(seed);
  const [steps, setSteps] = useState<TreeStep[]>([
    {
      root: structuredClone(tree.root),
      kind: "done",
      message:
        "An order-4 B+ tree: up to 4 child pointers and 3 keys per node.",
      active: [],
    },
  ]);
  const [index, setIndex] = useState(0),
    [playing, setPlaying] = useState(false);
  const [key, setKey] = useState("15"),
    [speed, setSpeed] = useState(900),
    [error, setError] = useState("");
  const reduced = useReducedMotion();
  const step = steps[index],
    diagram = useMemo(() => layout(step.root), [step.root]);
  const visibleKeys = diagram.nodes
    .filter((n) => n.node.leaf)
    .sort((a, b) => a.x - b.x)
    .flatMap((n) => n.node.keys);
  useEffect(() => {
    if (!playing) return;
    if (index >= steps.length - 1) {
      setPlaying(false);
      return;
    }
    const timeout = window.setTimeout(
      () => setIndex((i) => i + 1),
      1800 - speed,
    );
    return () => window.clearTimeout(timeout);
  }, [playing, index, steps.length, speed]);
  const change = (action: "insert" | "delete") => {
    const value = Number(key);
    if (!key.trim() || !Number.isSafeInteger(value) || Math.abs(value) > 999) {
      setError("Enter a whole number between −999 and 999.");
      return;
    }
    if (
      action === "insert" &&
      tree.values().length >= 32 &&
      !tree.values().includes(value)
    ) {
      setError(
        "This visual demo holds 32 unique keys. Delete a key to make room.",
      );
      return;
    }
    setError("");
    setSteps(tree[action](value));
    setIndex(0);
    setPlaying(true);
  };
  const reset = () => {
    const values = tree.values();
    values.forEach((n) => tree.delete(n));
    [10, 20, 5, 6, 12, 30, 7, 17].forEach((n) => tree.insert(n));
    setSteps([
      {
        root: structuredClone(tree.root),
        kind: "done",
        message:
          "Example restored. Insert 15, or delete 5 to watch rebalancing.",
        active: [],
      },
    ]);
    setIndex(0);
    setPlaying(false);
    setError("");
  };
  return (
    <section className="widget systems-widget" aria-label="B+ tree explorer">
      <header className="widget-header">
        <div>
          <p className="systems-eyebrow">INDEX STRUCTURES</p>
          <h3>B+ tree explorer</h3>
        </div>
        <span className="systems-tag">ORDER 4</span>
      </header>
      <p className="muted">
        Records stay in linked leaves. Separator keys route the search; splits,
        borrowing and merges keep every leaf at the same depth.
      </p>
      <form
        className="systems-controls"
        onSubmit={(event) => {
          event.preventDefault();
          change("insert");
        }}
      >
        <label className="field">
          Key
          <input
            type="number"
            min="-999"
            max="999"
            step="1"
            value={key}
            onChange={(event) => setKey(event.target.value)}
          />
        </label>
        <button className="button primary" type="submit" disabled={playing}>
          Insert key
        </button>
        <button
          className="button"
          type="button"
          disabled={playing}
          onClick={() => change("delete")}
        >
          Delete key
        </button>
        <button className="button" type="button" onClick={reset}>
          Reset example
        </button>
      </form>
      {error && (
        <p role="alert" className="systems-error">
          {error}
        </p>
      )}
      <div
        className="systems-diagram"
        tabIndex={0}
        role="region"
        aria-label="Scrollable B+ tree diagram"
      >
        <svg
          width={diagram.width}
          height={diagram.height}
          viewBox={`0 0 ${diagram.width} ${diagram.height}`}
          role="img"
          aria-label={`B+ tree with ${visibleKeys.length} keys. Current step: ${step.message}`}
        >
          <defs>
            <marker
              id="bplus-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M0 0L10 5L0 10" fill="var(--cyan)" />
            </marker>
          </defs>
          {diagram.nodes.map(
            ({ node, x, y }) =>
              !node.leaf &&
              node.children.map((child) => {
                const target = diagram.nodes.find(
                  (n) => n.node.id === child.id,
                )!;
                return (
                  <motion.path
                    key={`${node.id}-${child.id}`}
                    d={`M${x} ${y + 22} L${target.x} ${target.y - 22}`}
                    stroke="var(--border)"
                    strokeWidth="2"
                    fill="none"
                    initial={false}
                    animate={{
                      d: `M${x} ${y + 22} L${target.x} ${target.y - 22}`,
                    }}
                    transition={{ duration: reduced ? 0 : 0.35 }}
                  />
                );
              }),
          )}
          {diagram.nodes
            .filter((n) => n.node.leaf && n.node.next)
            .map(({ node, x, y }) => {
              const next = diagram.nodes.find(
                (n) => n.node.id === node.next?.id,
              );
              return (
                next && (
                  <path
                    key={`link-${node.id}`}
                    d={`M${x + 59} ${y + 10} L${next.x - 64} ${y + 10}`}
                    stroke="var(--cyan)"
                    strokeDasharray="4 4"
                    markerEnd="url(#bplus-arrow)"
                    fill="none"
                  />
                )
              );
            })}
          <AnimatePresence>
            {diagram.nodes.map(({ node, x, y }) => (
              <motion.g
                key={node.id}
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1, x, y }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.35 }}
              >
                <rect
                  x="-59"
                  y="-22"
                  width="118"
                  height="44"
                  rx="8"
                  fill={
                    step.active.includes(node.id)
                      ? "var(--overlay)"
                      : "var(--surface)"
                  }
                  stroke={
                    step.active.includes(node.id)
                      ? "var(--accent)"
                      : node.leaf
                        ? "var(--cyan)"
                        : "var(--border)"
                  }
                  strokeWidth={step.active.includes(node.id) ? 2 : 1}
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="var(--foreground)"
                  fontSize="14"
                  fontFamily="var(--font-mono)"
                >
                  {node.keys.length ? node.keys.join(" · ") : "empty"}
                </text>
                <text
                  y="39"
                  textAnchor="middle"
                  fill="var(--muted)"
                  fontSize="10"
                >
                  {node.leaf ? "LEAF" : "INDEX"}
                </text>
              </motion.g>
            ))}
          </AnimatePresence>
        </svg>
      </div>
      <div className="systems-step" role="status" aria-live="polite">
        <span className="systems-tag">{step.kind.toUpperCase()}</span>
        <p>{step.message}</p>
      </div>
      <div className="systems-controls systems-playback">
        <button
          className="button"
          onClick={() => {
            setPlaying(false);
            setIndex((i) => Math.max(0, i - 1));
          }}
          disabled={index === 0}
        >
          Previous step
        </button>
        <button
          className="button"
          onClick={() => {
            if (index === steps.length - 1) setIndex(0);
            setPlaying((p) => !p);
          }}
          disabled={steps.length < 2}
        >
          {playing ? "Pause" : "Play steps"}
        </button>
        <button
          className="button"
          onClick={() => {
            setPlaying(false);
            setIndex((i) => Math.min(steps.length - 1, i + 1));
          }}
          disabled={index === steps.length - 1}
        >
          Next step
        </button>
        <span className="muted mono">
          {index + 1} / {steps.length}
        </span>
        <label className="systems-speed">
          Animation speed
          <input
            aria-label="Tree animation speed"
            type="range"
            min="200"
            max="1500"
            step="100"
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value))}
          />
          <span>
            {speed >= 1200 ? "Fast" : speed <= 500 ? "Slow" : "Normal"}
          </span>
        </label>
      </div>
      <p className="systems-leaf-chain mono">
        <span className="muted">Sorted leaf scan: </span>
        {visibleKeys.join(" → ") || "empty"}
      </p>
      <p className="muted systems-footnote">
        Unique integer keys · 2–3 keys in non-root leaves · 2–4 children in
        non-root index nodes. The diagram temporarily shows overflow or
        underflow before repair.
      </p>
    </section>
  );
}
