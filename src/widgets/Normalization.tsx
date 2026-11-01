import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  KeyRound,
  RotateCcw,
} from "lucide-react";
import { normalizationTables, reconstructEnrollment } from "./relations";
import "./widgets.css";

const steps = [
  {
    label: "UNF",
    title: "A sheet with repeating groups.",
    description:
      "Each student has a list of course / instructor / office / building / grade values in one cell. Updating one fact means editing a list.",
    dependency:
      "student → name; (student, course) → instructor, grade; instructor → course, office; office → building",
    highlight: ["courses (repeating group)"],
    action: "Make every value atomic",
  },
  {
    label: "1NF",
    title: "One value. One cell.",
    description:
      "Split each repeating group into its own row. Both (student, course) and (student, instructor) are candidate keys. Student → name is partial on either key; instructor → office, building is partial on the second key.",
    dependency:
      "student → name; instructor → office, building · partial dependencies",
    highlight: ["student", "name", "instructor", "office", "building"],
    action: "Remove partial dependencies on every candidate key",
  },
  {
    label: "2NF",
    title: "Respect every candidate key.",
    description:
      "Move student names into Students and office details into Instructors. No non-prime attribute depends on part of any candidate key. In Instructors, building still depends transitively on its single-attribute key through office.",
    dependency:
      "instructor → office → building · transitive non-prime dependency",
    highlight: ["instructor", "office", "building"],
    action: "Separate office and building facts",
  },
  {
    label: "3NF",
    title: "Give office facts a home.",
    description:
      "Offices stores office → building, leaving instructor → office in Instructors. Every relation is now in 3NF. In Enrollments, (student, course) and (student, instructor) remain candidate keys. Instructor → course is allowed because course is prime, although instructor is not a superkey.",
    dependency:
      "instructor → course · a non-superkey determinant with a prime dependent",
    highlight: ["instructor", "course"],
    action: "Require every determinant to be a superkey",
  },
  {
    label: "BCNF",
    title: "Every determinant is a key.",
    description:
      "Teaching maps each instructor to one course and office; Offices keeps each office’s building. Enrollments uses (student, instructor). This lossless split removes instructor → course from Enrollments. Enforcing (student, course) → instructor now requires a join or an extra constraint.",
    dependency:
      "student → name; instructor → course, office; office → building; (student, instructor) → grade",
    highlight: [],
    action: "All five stages explored",
  },
];
export default function Normalization({
  onComplete,
}: {
  onComplete?: () => void;
}) {
  const [stage, setStage] = useState(0);
  const [showDependency, setShowDependency] = useState(true);
  const visitedStages = useRef(new Set([0]));
  const completed = useRef(false);
  const reducedMotion = useReducedMotion();
  const step = steps[stage];
  const tables = normalizationTables(stage);
  function visitStage(nextStage: number) {
    visitedStages.current.add(nextStage);
    setStage(nextStage);
    if (visitedStages.current.size === steps.length && !completed.current) {
      completed.current = true;
      onComplete?.();
    }
  }
  return (
    <section className="widget" aria-label="Normalization stepper">
      <div className="widget-header">
        <div>
          <span className="eyebrow">SCHEMA REFINEMENT</span>
          <h2>Less repetition. Better relations.</h2>
          <p className="muted">
            Follow six enrollments from a messy sheet to BCNF.
          </p>
        </div>
        <button className="button" onClick={() => visitStage(0)}>
          <RotateCcw size={16} />
          Start over
        </button>
      </div>
      <div
        className="normalization-steps"
        role="group"
        aria-label="Normalization stages"
      >
        {steps.map((item, index) => {
          const visited = visitedStages.current.has(index) && index !== stage;
          return (
            <button
              key={item.label}
              className={`normalization-step ${index === stage ? "current" : ""} ${visited ? "completed" : ""}`}
              aria-pressed={stage === index}
              onClick={() => visitStage(index)}
            >
              <span>{visited ? <Check size={15} /> : `0${index + 1}`}</span>
              {item.label}
            </button>
          );
        })}
      </div>
      <div className="normalization-description" aria-live="polite">
        <span className="mono muted">STEP {stage + 1} / 5</span>
        <h3>{step.title}</h3>
        <p>{step.description}</p>
      </div>
      <label className="dependency-toggle">
        <input
          type="checkbox"
          checked={showDependency}
          onChange={(event) => setShowDependency(event.target.checked)}
        />
        Highlight functional dependencies
      </label>
      {showDependency && (
        <p className="dependency-callout mono">
          <ArrowRight size={16} aria-hidden="true" />
          {step.dependency}
        </p>
      )}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={stage}
          className="normalization-tables"
          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {tables.map((table) => (
            <div className="relation-panel" key={table.name}>
              <div className="relation-title">
                <h4>{table.name}</h4>
                <span className="muted mono">{table.rows.length} rows</span>
              </div>
              <div
                className="table-scroll"
                role="region"
                aria-label={`${table.name} table`}
                tabIndex={0}
              >
                <table className="data-table">
                  <caption className="sr-only">
                    {step.label}: {table.name}. Primary key:{" "}
                    {table.keys.join(", ")}.
                  </caption>
                  <thead>
                    <tr>
                      {table.columns.map((column) => (
                        <th
                          className={
                            showDependency && step.highlight.includes(column)
                              ? "dependency-highlight"
                              : ""
                          }
                          key={column}
                          scope="col"
                        >
                          {table.keys.includes(column) && (
                            <KeyRound size={12} aria-label="Primary key" />
                          )}
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row, index) => (
                      <tr key={index}>
                        {row.map((value, columnIndex) => (
                          <td
                            className={
                              showDependency &&
                              step.highlight.includes(
                                table.columns[columnIndex],
                              )
                                ? "dependency-highlight"
                                : ""
                            }
                            key={columnIndex}
                          >
                            {value}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </motion.div>
      </AnimatePresence>
      <div className="normalization-footnote">
        <span>
          <KeyRound size={13} />
          Primary key
        </span>
        <span>
          {stage > 0
            ? `${reconstructEnrollment(stage).length} original enrollments reconstruct without loss.`
            : "Each course group contains five separate facts."}
        </span>
      </div>
      <div className="widget-toolbar normalization-controls">
        <button
          className="button"
          disabled={stage === 0}
          onClick={() => visitStage(stage - 1)}
        >
          <ArrowLeft size={16} />
          Previous
        </button>
        <span className="muted">
          {stage === 4 && !completed.current
            ? "Visit every stage to complete the walkthrough"
            : step.action}
        </span>
        <button
          className="button primary"
          disabled={stage === 4}
          onClick={() => visitStage(stage + 1)}
        >
          Next
          <ArrowRight size={16} />
        </button>
      </div>
      <p className="muted normalization-assumption">
        Scenario rules: each student chooses one instructor per course and earns
        one grade; each instructor teaches one course and has one office; each
        office belongs to one building. Courses can have several instructors,
        offices can be shared, and buildings can contain several offices.
      </p>
    </section>
  );
}
