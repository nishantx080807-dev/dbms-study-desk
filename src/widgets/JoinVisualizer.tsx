import { useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Link2 } from "lucide-react";
import { relationalJoin, type JoinType } from "./relations";
import "./widgets.css";

type Student = { id: number; name: string; courseId: number | null };
type Course = { id: number | null; title: string };
const scenarios: {
  name: string;
  left: Student[];
  right: Course[];
  note: string;
}[] = [
  {
    name: "University enrollments",
    left: [
      { id: 1, name: "Ada", courseId: 10 },
      { id: 2, name: "Lin", courseId: 20 },
      { id: 3, name: "Mira", courseId: 40 },
    ],
    right: [
      { id: 10, title: "DBMS" },
      { id: 20, title: "Networks" },
      { id: 30, title: "AI" },
    ],
    note: "Ada and Lin match. Mira has no matching course. AI has no matching student.",
  },
  {
    name: "Duplicate keys & NULL",
    left: [
      { id: 1, name: "Ada", courseId: 10 },
      { id: 2, name: "Lin", courseId: 10 },
      { id: 3, name: "Mira", courseId: null },
    ],
    right: [
      { id: 10, title: "DBMS A" },
      { id: 10, title: "DBMS B" },
      { id: null, title: "Unassigned" },
    ],
    note: "Two rows on each side share key 10, creating four matches. SQL equality never matches NULL to NULL. This sample intentionally permits duplicate course IDs.",
  },
  {
    name: "No matching keys",
    left: [
      { id: 1, name: "Ada", courseId: 80 },
      { id: 2, name: "Lin", courseId: 90 },
    ],
    right: [
      { id: 10, title: "DBMS" },
      { id: 20, title: "Networks" },
    ],
    note: "No keys match. INNER is empty; outer joins preserve the selected side and fill missing fields with NULL.",
  },
];
const descriptions: Record<JoinType, string> = {
  INNER: "Keep only pairs whose non-NULL keys match.",
  LEFT: "Keep every student. A missing course becomes NULL.",
  RIGHT: "Keep every course. A missing student becomes NULL.",
  FULL: "Keep every matching pair and every unmatched row from both sides.",
};
const NullValue = () => <span className="sql-null">NULL</span>;
export default function JoinVisualizer() {
  const [join, setJoin] = useState<JoinType>("INNER");
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [focused, setFocused] = useState<number | null>(null);
  const reducedMotion = useReducedMotion();
  const uniqueId = useId().replace(/:/g, "");
  const scenario = scenarios[scenarioIndex];
  const result = relationalJoin(
    scenario.left,
    scenario.right,
    "courseId",
    "id",
    join,
  );
  const matches = relationalJoin(
    scenario.left,
    scenario.right,
    "courseId",
    "id",
    "INNER",
  );
  const activeRow = focused == null ? null : result[focused];
  const changeJoin = (type: JoinType) => {
    setJoin(type);
    setFocused(null);
  };
  return (
    <section className="widget" aria-label="SQL join visualizer">
      <div className="widget-header">
        <div>
          <span className="eyebrow">RELATIONAL ALGEBRA</span>
          <h2>Two tables. Four ways to connect.</h2>
          <p className="muted">
            Follow the keys and see exactly which rows survive.
          </p>
        </div>
        <Link2 className="widget-decoration" size={30} aria-hidden="true" />
      </div>
      <div className="join-top-controls">
        <div className="join-switch" role="group" aria-label="Join type">
          {(["INNER", "LEFT", "RIGHT", "FULL"] as const).map((type) => (
            <button
              className={`button ${join === type ? "is-active" : ""}`}
              key={type}
              aria-pressed={join === type}
              onClick={() => changeJoin(type)}
            >
              {type}
            </button>
          ))}
        </div>
        <label className="field">
          Sample scenario
          <select
            value={scenarioIndex}
            onChange={(event) => {
              setScenarioIndex(Number(event.target.value));
              setFocused(null);
            }}
          >
            {scenarios.map((item, index) => (
              <option key={item.name} value={index}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="join-summary">
        <svg
          viewBox="0 0 180 100"
          className="join-venn"
          role="img"
          aria-label={`${join} join includes ${join === "INNER" ? "the overlapping matches" : join === "FULL" ? "both sets" : `all of the ${join.toLowerCase()} set and its matches`}`}
        >
          <defs>
            <clipPath id={`${uniqueId}-venn`}>
              <circle cx="65" cy="46" r="34" />
            </clipPath>
          </defs>
          <circle
            cx="65"
            cy="46"
            r="34"
            fill={
              join === "LEFT" || join === "FULL"
                ? "var(--accent)"
                : "var(--overlay)"
            }
            fillOpacity="0.7"
            stroke="var(--accent)"
          />
          <circle
            cx="110"
            cy="46"
            r="34"
            fill={
              join === "RIGHT" || join === "FULL"
                ? "var(--accent)"
                : "var(--overlay)"
            }
            fillOpacity="0.7"
            stroke="var(--accent)"
          />
          <circle
            cx="110"
            cy="46"
            r="34"
            fill="var(--cyan)"
            clipPath={`url(#${uniqueId}-venn)`}
          />
          <text x="47" y="50">
            L
          </text>
          <text x="120" y="50">
            R
          </text>
          <text x="88" y="96" textAnchor="middle">
            key regions
          </text>
        </svg>
        <div>
          <strong>{join} JOIN</strong>
          <p>{descriptions[join]}</p>
          <p className="muted">{scenario.note}</p>
        </div>
      </div>
      <pre className="join-query">
        <code>
          SELECT s.name, s.course_id, c.id, c.title{"\n"}FROM students s{" "}
          {join === "FULL" ? "FULL OUTER" : join} JOIN courses c{"\n"} ON
          s.course_id = c.id;
        </code>
      </pre>
      <div
        className="table-scroll join-source-scroll"
        tabIndex={0}
        role="region"
        aria-label="Source tables and matching key connections"
      >
        <div className="join-inputs">
          <div className="join-source">
            <h4>
              students <span className="muted">LEFT</span>
            </h4>
            <table className="data-table">
              <caption className="sr-only">Students source rows</caption>
              <thead>
                <tr>
                  <th scope="col">name</th>
                  <th scope="col">course_id</th>
                </tr>
              </thead>
              <tbody>
                {scenario.left.map((row) => {
                  const included = result.some((pair) => pair.left === row);
                  return (
                    <tr
                      className={`${included ? "row-included" : "row-excluded"} ${activeRow?.left === row ? "row-focused" : ""}`}
                      key={row.id}
                    >
                      <td>{row.name}</td>
                      <td>{row.courseId ?? <NullValue />}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <svg
            viewBox={`0 0 100 ${76 + Math.max(scenario.left.length, scenario.right.length) * 44}`}
            className="join-connections"
            aria-label={`${matches.length} matching row pairs`}
            role="img"
          >
            {matches.map((pair, index) => {
              const leftIndex = scenario.left.indexOf(pair.left!);
              const rightIndex = scenario.right.indexOf(pair.right!);
              const y1 = 98 + leftIndex * 44;
              const y2 = 98 + rightIndex * 44;
              return (
                <motion.path
                  key={`${scenarioIndex}-${index}`}
                  d={`M 0 ${y1} C 45 ${y1}, 55 ${y2}, 100 ${y2}`}
                  fill="none"
                  stroke={
                    activeRow &&
                    activeRow.left === pair.left &&
                    activeRow.right === pair.right
                      ? "var(--cyan)"
                      : "var(--accent)"
                  }
                  strokeWidth={
                    activeRow &&
                    activeRow.left === pair.left &&
                    activeRow.right === pair.right
                      ? 3
                      : 1.5
                  }
                  initial={
                    reducedMotion ? false : { pathLength: 0, opacity: 0 }
                  }
                  animate={{
                    pathLength: 1,
                    opacity:
                      activeRow &&
                      (activeRow.left !== pair.left ||
                        activeRow.right !== pair.right)
                        ? 0.25
                        : 0.85,
                  }}
                  transition={{
                    duration: reducedMotion ? 0 : 0.45,
                    delay: reducedMotion ? 0 : index * 0.05,
                  }}
                />
              );
            })}
          </svg>
          <div className="join-source">
            <h4>
              courses <span className="muted">RIGHT</span>
            </h4>
            <table className="data-table">
              <caption className="sr-only">Courses source rows</caption>
              <thead>
                <tr>
                  <th scope="col">id</th>
                  <th scope="col">title</th>
                </tr>
              </thead>
              <tbody>
                {scenario.right.map((row, index) => {
                  const included = result.some((pair) => pair.right === row);
                  return (
                    <tr
                      className={`${included ? "row-included" : "row-excluded"} ${activeRow?.right === row ? "row-focused" : ""}`}
                      key={index}
                    >
                      <td>{row.id ?? <NullValue />}</td>
                      <td>{row.title}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="join-legend">
        <span>
          <i className="legend-dot included" />
          Included in result
        </span>
        <span>
          <i className="legend-dot excluded" />
          Excluded
        </span>
        <span>
          <ArrowRight size={13} />
          Equal, non-NULL keys
        </span>
      </div>
      <div className="relation-panel join-result">
        <div className="relation-title">
          <h4>Result</h4>
          <span role="status" className="mono">
            {result.length} rows ·{" "}
            {result.filter((row) => row.left && row.right).length} matched ·{" "}
            {result.filter((row) => !row.left || !row.right).length} unmatched
          </span>
        </div>
        <p className="muted join-result-hint">
          Focus or hover a result row to trace its source.
        </p>
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Join result table"
        >
          <table className="data-table">
            <caption className="sr-only">{join} join result</caption>
            <thead>
              <tr>
                <th scope="col">s.name</th>
                <th scope="col">s.course_id</th>
                <th scope="col">c.id</th>
                <th scope="col">c.title</th>
                <th scope="col">status</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="sync" initial={false}>
                {result.map((pair, index) => (
                  <motion.tr
                    key={`${scenarioIndex}-${join}-${index}`}
                    tabIndex={0}
                    aria-label={`Result ${index + 1}: ${pair.left?.name ?? "NULL"}, ${pair.right?.title ?? "NULL"}, ${pair.left && pair.right ? "matched" : "unmatched"}`}
                    onFocus={() => setFocused(index)}
                    onBlur={() => setFocused(null)}
                    onMouseEnter={() => setFocused(index)}
                    onMouseLeave={() => setFocused(null)}
                    className={focused === index ? "row-focused" : ""}
                    initial={reducedMotion ? false : { opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={reducedMotion ? undefined : { opacity: 0 }}
                    transition={{
                      duration: reducedMotion ? 0 : 0.18,
                      delay: reducedMotion ? 0 : index * 0.025,
                    }}
                  >
                    <td>{pair.left?.name ?? <NullValue />}</td>
                    <td>{pair.left?.courseId ?? <NullValue />}</td>
                    <td>{pair.right?.id ?? <NullValue />}</td>
                    <td>{pair.right?.title ?? <NullValue />}</td>
                    <td>
                      <span
                        className={`join-status ${pair.left && pair.right ? "matched" : "unmatched"}`}
                      >
                        {pair.left && pair.right ? "matched" : "unmatched"}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {result.length === 0 && (
                <tr>
                  <td colSpan={5} className="join-empty">
                    No matching rows. Try an outer join to preserve unmatched
                    rows.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="muted join-null-note">
        <span className="sql-null">NULL</span> means no value. Outer joins add
        it for fields on the missing side. The Venn diagram shows included key
        regions; duplicate keys can produce several row pairs.
      </p>
    </section>
  );
}
