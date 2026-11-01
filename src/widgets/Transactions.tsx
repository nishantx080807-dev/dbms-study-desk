import { useId, useMemo, useState } from "react";
import {
  analyzeSchedule,
  analyzeLocks,
  requestLock,
  releaseLock,
  type Operation,
  type GraphEdge,
  type Transaction,
  type Item,
  type LockState,
} from "./schedule-engine";
import "./systems.css";

const transactionList: Transaction[] = ["T1", "T2", "T3"];
const example: Operation[] = [
  { id: 1, transaction: "T1", kind: "w", item: "X" },
  { id: 2, transaction: "T2", kind: "r", item: "X" },
  { id: 3, transaction: "T2", kind: "w", item: "Y" },
  { id: 4, transaction: "T1", kind: "r", item: "Y" },
];
const deadlock: LockState = {
  owners: { X: "T1", Y: "T2" },
  waiting: [
    { transaction: "T1", item: "Y" },
    { transaction: "T2", item: "X" },
  ],
};

function Graph({
  edges,
  cycle,
  label,
}: {
  edges: GraphEdge[];
  cycle: Transaction[];
  label: string;
}) {
  const marker = useId().replaceAll(":", "");
  const points = {
    T1: { x: 80, y: 70 },
    T2: { x: 320, y: 70 },
    T3: { x: 200, y: 200 },
  };
  return (
    <svg
      className="systems-graph"
      viewBox="0 0 400 255"
      role="img"
      aria-label={`${label}. ${edges.length ? edges.map((edge) => `${edge.from} to ${edge.to}`).join(", ") : "No edges"}. ${cycle.length ? `Cycle: ${cycle.join(" to ")}` : "No cycle"}.`}
    >
      <defs>
        <marker
          id={marker}
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path d="M0 0L10 5L0 10" fill="context-stroke" />
        </marker>
      </defs>
      {edges.map((edge) => {
        const a = points[edge.from],
          b = points[edge.to],
          dx = b.x - a.x,
          dy = b.y - a.y,
          length = Math.hypot(dx, dy);
        const sx = a.x + (dx / length) * 29,
          sy = a.y + (dy / length) * 29,
          ex = b.x - (dx / length) * 34,
          ey = b.y - (dy / length) * 34;
        const cx = (a.x + b.x) / 2 - (dy / length) * 27,
          cy = (a.y + b.y) / 2 + (dx / length) * 27;
        const cyclic = cycle.some(
          (node, i) => node === edge.from && cycle[i + 1] === edge.to,
        );
        return (
          <path
            key={`${edge.from}-${edge.to}`}
            d={`M${sx} ${sy} Q${cx} ${cy} ${ex} ${ey}`}
            fill="none"
            stroke={cyclic ? "var(--danger)" : "var(--accent)"}
            strokeWidth="2"
            markerEnd={`url(#${marker})`}
          />
        );
      })}
      {transactionList.map((t) => (
        <g key={t}>
          <circle
            cx={points[t].x}
            cy={points[t].y}
            r="27"
            fill="var(--surface)"
            stroke={cycle.includes(t) ? "var(--danger)" : "var(--border)"}
            strokeWidth="2"
          />
          <text
            x={points[t].x}
            y={points[t].y + 5}
            textAnchor="middle"
            fill="var(--foreground)"
            fontFamily="var(--font-mono)"
            fontSize="15"
          >
            {t}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function Transactions() {
  const [ops, setOps] = useState<Operation[]>(example),
    [nextId, setNextId] = useState(5);
  const [transaction, setTransaction] = useState<Transaction>("T1"),
    [kind, setKind] = useState<"r" | "w">("r"),
    [item, setItem] = useState<Item>("X");
  const [announcement, setAnnouncement] = useState("");
  const [locks, setLocks] = useState<LockState>({
    owners: { X: "T1", Y: "T2" },
    waiting: [],
  });
  const [lockTransaction, setLockTransaction] = useState<Transaction>("T1"),
    [lockItem, setLockItem] = useState<Item>("Y");
  const schedule = useMemo(() => analyzeSchedule(ops), [ops]),
    lockGraph = useMemo(() => analyzeLocks(locks), [locks]);
  const move = (from: number, to: number) => {
    if (from < 0 || to < 0 || to >= ops.length || from === to) return;
    setOps((current) => {
      const next = [...current];
      const [operation] = next.splice(from, 1);
      next.splice(to, 0, operation);
      return next;
    });
    setAnnouncement(`Moved step ${from + 1} to position ${to + 1}.`);
  };
  return (
    <section
      className="widget systems-widget"
      aria-label="Transaction concurrency lab"
    >
      <header className="widget-header">
        <div>
          <p className="systems-eyebrow">CONCURRENCY CONTROL</p>
          <h3>Schedule & deadlock lab</h3>
        </div>
        <span className="systems-tag">LIVE ANALYSIS</span>
      </header>
      <p className="muted">
        Build an interleaving, then follow its conflicts. Two operations
        conflict when they belong to different transactions, touch the same
        item, and at least one writes.
      </p>
      <form
        className="systems-controls"
        onSubmit={(event) => {
          event.preventDefault();
          setOps((current) => [
            ...current,
            { id: nextId, transaction, kind, item },
          ]);
          setNextId((id) => id + 1);
          setAnnouncement(`Added ${kind}(${item}) for ${transaction}.`);
        }}
      >
        <label className="field">
          Transaction
          <select
            value={transaction}
            onChange={(e) => setTransaction(e.target.value as Transaction)}
          >
            {transactionList.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Operation
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as "r" | "w")}
          >
            <option value="r">Read</option>
            <option value="w">Write</option>
          </select>
        </label>
        <label className="field">
          Data item
          <select
            value={item}
            onChange={(e) => setItem(e.target.value as Item)}
          >
            <option>X</option>
            <option>Y</option>
          </select>
        </label>
        <button className="button primary" disabled={ops.length >= 24}>
          Add operation
        </button>
      </form>
      <div className="systems-controls">
        <button
          className="button"
          onClick={() => {
            setOps(example);
            setNextId(5);
          }}
        >
          Load cyclic example
        </button>
        <button
          className="button"
          onClick={() => {
            setOps([example[0], example[3], example[1], example[2]]);
            setNextId(5);
          }}
        >
          Load serial example
        </button>
        <button
          className="button"
          disabled={!ops.length}
          onClick={() => setOps([])}
        >
          Clear schedule
        </button>
      </div>
      <div className="systems-schedule-layout">
        <div>
          <h4>Operation order</h4>
          <p className="muted systems-footnote">
            Drag rows, or use the Move up and Move down buttons. The current
            order inside each transaction is defined by this schedule.
          </p>
          <ol className="systems-operations" aria-label="Schedule operations">
            {ops.map((op, index) => (
              <li
                key={op.id}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData("text/plain", String(op.id));
                  event.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const from = ops.findIndex(
                    (operation) =>
                      String(operation.id) ===
                      event.dataTransfer.getData("text/plain"),
                  );
                  move(from, index);
                }}
              >
                <span className="systems-operation-number">{index + 1}</span>
                <span
                  className={`systems-transaction systems-${op.transaction.toLowerCase()}`}
                >
                  {op.transaction}
                </span>
                <strong className="mono">
                  {op.kind}({op.item})
                </strong>
                <div className="systems-row-actions">
                  <button
                    className="button"
                    aria-label={`Move step ${index + 1} up`}
                    disabled={index === 0}
                    onClick={() => move(index, index - 1)}
                  >
                    ↑
                  </button>
                  <button
                    className="button"
                    aria-label={`Move step ${index + 1} down`}
                    disabled={index === ops.length - 1}
                    onClick={() => move(index, index + 1)}
                  >
                    ↓
                  </button>
                  <button
                    className="button"
                    aria-label={`Remove step ${index + 1}`}
                    onClick={() =>
                      setOps((current) =>
                        current.filter((operation) => operation.id !== op.id),
                      )
                    }
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ol>
          {!ops.length && (
            <p className="muted">
              The schedule is empty. Add an operation to begin.
            </p>
          )}
        </div>
        <div className="systems-analysis">
          <h4>Precedence graph</h4>
          <Graph
            edges={schedule.edges}
            cycle={schedule.cycle}
            label="Precedence graph"
          />
          <div
            role="status"
            aria-live="polite"
            className={`systems-verdict ${schedule.serializable ? "is-good" : "is-cycle"}`}
          >
            <strong>
              {schedule.serializable
                ? "Conflict-serializable"
                : "Not conflict-serializable"}
            </strong>
            <p>
              {schedule.cycle.length
                ? `Cycle: ${schedule.cycle.join(" → ")}.`
                : schedule.order.length
                  ? `Equivalent serial order: ${schedule.order.join(" → ")}.`
                  : "An empty schedule has no conflicts."}
            </p>
          </div>
          <details className="systems-conflicts" open>
            <summary>Why these edges exist ({schedule.edges.length})</summary>
            {schedule.edges.length ? (
              schedule.edges.map((edge) => (
                <div key={`${edge.from}-${edge.to}`}>
                  <strong className="mono">
                    {edge.from} → {edge.to}
                  </strong>
                  <ul>
                    {edge.conflicts.map((reason, i) => (
                      <li key={i}>{reason}</li>
                    ))}
                  </ul>
                </div>
              ))
            ) : (
              <p className="muted">
                No cross-transaction conflicts. Read/read pairs do not create an
                edge.
              </p>
            )}
          </details>
        </div>
      </div>
      <p className="systems-screen-reader" role="status" aria-live="polite">
        {announcement}
      </p>
      <section className="systems-deadlock" aria-label="Deadlock explorer">
        <div>
          <p className="systems-eyebrow">EXCLUSIVE LOCKS</p>
          <h4>Who is waiting for whom?</h4>
          <p className="muted">
            A wait-for arrow points from a blocked transaction to the lock
            owner. A directed cycle means deadlock in this exclusive-lock model.
          </p>
        </div>
        <div className="systems-controls">
          <label className="field">
            Lock transaction
            <select
              value={lockTransaction}
              onChange={(e) =>
                setLockTransaction(e.target.value as Transaction)
              }
            >
              {transactionList.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Resource
            <select
              value={lockItem}
              onChange={(e) => setLockItem(e.target.value as Item)}
            >
              <option>X</option>
              <option>Y</option>
            </select>
          </label>
          <button
            className="button primary"
            onClick={() =>
              setLocks((current) =>
                requestLock(current, lockTransaction, lockItem),
              )
            }
          >
            Request lock
          </button>
          <button
            className="button"
            onClick={() =>
              setLocks((current) => releaseLock(current, lockTransaction))
            }
          >
            Release all for {lockTransaction}
          </button>
          <button
            className="button"
            onClick={() => setLocks(structuredClone(deadlock))}
          >
            Load deadlock
          </button>
        </div>
        <div className="systems-schedule-layout">
          <div>
            <div className="systems-locks">
              {(["X", "Y"] as Item[]).map((resource) => (
                <div key={resource}>
                  <span className="mono">{resource}</span>
                  <strong>
                    {locks.owners[resource]
                      ? `Held by ${locks.owners[resource]}`
                      : "Available"}
                  </strong>
                </div>
              ))}
            </div>
            <h4>Wait queue</h4>
            {locks.waiting.length ? (
              <ul>
                {locks.waiting.map((w) => (
                  <li key={`${w.transaction}-${w.item}`}>
                    {w.transaction} requests {w.item}; waiting for{" "}
                    {locks.owners[w.item]}.
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No transactions are waiting.</p>
            )}
            <p className="muted systems-footnote">
              Releasing all locks also cancels that transaction’s pending
              requests. Each available resource goes to its oldest waiting
              request.
            </p>
          </div>
          <div className="systems-analysis">
            <Graph
              edges={lockGraph.edges}
              cycle={lockGraph.cycle}
              label="Wait-for graph"
            />
            <div
              className={`systems-verdict ${lockGraph.cycle.length ? "is-cycle" : "is-good"}`}
              role="status"
              aria-live="polite"
            >
              <strong>
                {lockGraph.cycle.length ? "Deadlock detected" : "No deadlock"}
              </strong>
              <p>
                {lockGraph.cycle.length
                  ? lockGraph.cycle.join(" → ")
                  : "The wait-for graph has no directed cycle."}
              </p>
              {lockGraph.cycle.length > 0 && (
                <button
                  className="button"
                  onClick={() =>
                    setLocks((current) =>
                      releaseLock(current, lockGraph.cycle[0]),
                    )
                  }
                >
                  Abort {lockGraph.cycle[0]} and release locks
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}
