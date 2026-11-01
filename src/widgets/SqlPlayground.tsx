import { useCallback, useEffect, useId, useRef, useState } from "react";
import { basicSetup, EditorView } from "codemirror";
import { Compartment } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { sql, SQLite } from "@codemirror/lang-sql";
import {
  Check,
  Database,
  LoaderCircle,
  Play,
  RotateCcw,
  Terminal,
} from "lucide-react";
import type { SqlExecution } from "./sql-engine";
import { createSqlWorkerClient, type SqlWorkerClient } from "./sql-client";
import "./sql.css";

interface SqlPlaygroundProps {
  initialQuery?: string;
  onQuerySuccess?: () => void;
}

const DEFAULT_QUERY = `SELECT name, department, cgpa
FROM students
WHERE cgpa >= 8
ORDER BY cgpa DESC;`;

const EXAMPLES = [
  { name: "Filter students", query: DEFAULT_QUERY },
  {
    name: "Join three tables",
    query: `SELECT s.name, c.title, e.grade
FROM students AS s
JOIN enrollments AS e ON e.student_id = s.student_id
JOIN courses AS c ON c.course_id = e.course_id
WHERE c.title = 'DBMS'
ORDER BY s.name;`,
  },
  {
    name: "Group sales",
    query: `SELECT snum, COUNT(*) AS order_count,
       SUM(amt) AS total_sales
FROM orders
WHERE amt > 100
GROUP BY snum
HAVING SUM(amt) > 500
ORDER BY total_sales DESC;`,
  },
  {
    name: "Find missing enrollments",
    query: `SELECT s.name
FROM students AS s
WHERE NOT EXISTS (
  SELECT 1 FROM enrollments AS e
  WHERE e.student_id = s.student_id
);`,
  },
  {
    name: "Try a transaction",
    query: `BEGIN TRANSACTION;
UPDATE students SET cgpa = 9.0 WHERE student_id = 1;
SELECT name, cgpa FROM students WHERE student_id = 1;
ROLLBACK;
SELECT name, cgpa FROM students WHERE student_id = 1;`,
  },
];

const SCHEMA: Record<string, string[]> = {
  students: ["student_id", "name", "department", "semester", "cgpa"],
  courses: ["course_id", "title", "credits"],
  enrollments: ["student_id", "course_id", "grade"],
  orders: ["onum", "amt", "odate", "cnum", "snum"],
  customer: ["cnum", "cname", "city", "rating", "snum"],
  salespeople: ["snum", "sname", "city", "comm"],
};

const DARK_SQL_HIGHLIGHTS = HighlightStyle.define([
  { tag: [tags.keyword, tags.operatorKeyword], color: "#deb6fa" },
  { tag: tags.name, color: "#f0abb1" },
  { tag: [tags.string, tags.special(tags.string)], color: "#b7db91" },
  { tag: [tags.number, tags.bool, tags.null], color: "#efc996" },
  { tag: [tags.operator, tags.punctuation], color: "#cbd6d0" },
  {
    tag: [tags.standard(tags.name), tags.function(tags.variableName)],
    color: "#9ed7ef",
  },
  { tag: tags.comment, color: "#a6b4a5", fontStyle: "italic" },
  { tag: tags.invalid, color: "#ffb2a6", textDecoration: "underline" },
]);

const LIGHT_SQL_HIGHLIGHTS = HighlightStyle.define([
  { tag: [tags.keyword, tags.operatorKeyword], color: "#5e3979" },
  { tag: tags.name, color: "#8a3441" },
  { tag: [tags.string, tags.special(tags.string)], color: "#3e622e" },
  { tag: [tags.number, tags.bool, tags.null], color: "#775315" },
  { tag: [tags.operator, tags.punctuation], color: "#46554c" },
  {
    tag: [tags.standard(tags.name), tags.function(tags.variableName)],
    color: "#245b76",
  },
  { tag: tags.comment, color: "#60685e", fontStyle: "italic" },
  { tag: tags.invalid, color: "#9b3528", textDecoration: "underline" },
]);

function isDarkTheme() {
  const theme = document.documentElement.dataset.theme;
  return (
    theme === "dark" ||
    (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches)
  );
}

function editorTheme(dark: boolean) {
  return [
    syntaxHighlighting(dark ? DARK_SQL_HIGHLIGHTS : LIGHT_SQL_HIGHLIGHTS),
    EditorView.theme(
      {
        "&": {
          backgroundColor: "var(--sql-editor-bg)",
          color: "var(--sql-editor-fg)",
          fontSize: "13px",
        },
        ".cm-content": {
          fontFamily: '"JetBrains Mono Variable", "JetBrains Mono", monospace',
          padding: "18px 0",
          minHeight: "230px",
          caretColor: "var(--sql-accent)",
        },
        ".cm-gutters": {
          backgroundColor: "var(--sql-editor-bg)",
          borderRight: "none",
          color: "var(--sql-subtle)",
        },
        ".cm-lineNumbers .cm-gutterElement": {
          padding: "0 14px 0 12px",
          minWidth: "38px",
        },
        ".cm-line": { padding: "0 20px 0 8px" },
        ".cm-activeLine, .cm-activeLineGutter": {
          backgroundColor: "var(--sql-active-line)",
        },
        "&.cm-focused": { outline: "none" },
        "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
          backgroundColor: "var(--sql-selection)",
        },
        ".cm-cursor": { borderLeftColor: "var(--sql-accent)" },
        ".cm-scroller": { overflow: "auto" },
        ".cm-tooltip": {
          fontFamily: "inherit",
          backgroundColor: "var(--sql-editor-bg)",
          color: "var(--sql-editor-fg)",
          border: "1px solid var(--sql-line)",
        },
        ".cm-tooltip-autocomplete > ul > li[aria-selected]": {
          backgroundColor: "var(--sql-selection)",
          color: "var(--sql-editor-fg)",
        },
      },
      { dark },
    ),
  ];
}

function displayCell(value: string | number | Uint8Array | null) {
  if (value === null) return <span className="sql-null">NULL</span>;
  if (value instanceof Uint8Array)
    return <span className="sql-null">BLOB · {value.length} bytes</span>;
  return String(value);
}

export default function SqlPlayground({
  initialQuery,
  onQuerySuccess,
}: SqlPlaygroundProps) {
  const helpId = useId();
  const schemaId = useId();
  const editorHost = useRef<HTMLDivElement>(null);
  const editor = useRef<EditorView | null>(null);
  const engine = useRef<SqlWorkerClient | null>(null);
  const callback = useRef(onQuerySuccess);
  const runRef = useRef<() => void>(() => {});
  const initialText = useRef(
    initialQuery?.trim() ? initialQuery : DEFAULT_QUERY,
  );
  const lastLoaded = useRef(initialText.current);
  const lastProp = useRef(initialQuery);
  const [ready, setReady] = useState(false);
  const [running, setRunning] = useState(false);
  const runningRef = useRef(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SqlExecution | null>(null);
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    callback.current = onQuerySuccess;
  }, [onQuerySuccess]);

  const loadQuery = useCallback((query: string) => {
    const view = editor.current;
    if (!view) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: query },
    });
    lastLoaded.current = query;
    setPendingQuery(null);
    setError("");
    setNotice("Example loaded. Run the query to see its result.");
    view.focus();
  }, []);

  const runQuery = useCallback(async () => {
    if (!engine.current || !editor.current || runningRef.current) return;
    const database = engine.current;
    const query = editor.current.state.doc.toString();
    runningRef.current = true;
    setRunning(true);
    setError("");
    setNotice("");
    try {
      const execution = await database.execute(query);
      if (engine.current !== database) return;
      setResult(execution);
      setNotice("Query completed.");
      callback.current?.();
    } catch (failure) {
      if (engine.current !== database) return;
      setResult(null);
      setError(
        failure instanceof Error
          ? failure.message
          : "The query could not run. Check your SQL and try again.",
      );
    } finally {
      if (engine.current === database) {
        runningRef.current = false;
        setRunning(false);
      }
    }
  }, []);

  useEffect(() => {
    runRef.current = runQuery;
  }, [runQuery]);

  useEffect(() => {
    if (!editorHost.current) return;
    const theme = new Compartment();
    const view = new EditorView({
      doc: initialText.current,
      extensions: [
        basicSetup,
        sql({ dialect: SQLite, schema: SCHEMA }),
        theme.of(editorTheme(isDarkTheme())),
        EditorView.lineWrapping,
        EditorView.contentAttributes.of({
          "aria-label": "SQL query editor",
          "aria-describedby": helpId,
          spellcheck: "false",
        }),
        keymap.of([
          {
            key: "Mod-Enter",
            run: () => {
              runRef.current();
              return true;
            },
          },
        ]),
      ],
      parent: editorHost.current,
    });
    editor.current = view;
    const updateTheme = () =>
      view.dispatch({ effects: theme.reconfigure(editorTheme(isDarkTheme())) });
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class"],
    });
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", updateTheme);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", updateTheme);
      view.destroy();
      editor.current = null;
    };
  }, [helpId]);

  useEffect(() => {
    let disposed = false;
    setReady(false);
    setError("");
    runningRef.current = false;
    setRunning(false);
    const database = createSqlWorkerClient({
      onReadyChange: (value) => {
        if (!disposed) setReady(value);
      },
      onFailure: (message) => {
        if (!disposed) {
          setError(message);
          setResult(null);
        }
      },
    });
    engine.current = database;
    void database.whenReady().catch((failure) => {
      if (!disposed)
        setError(
          failure instanceof Error
            ? failure.message
            : "SQLite could not load. Retry loading the local SQL engine.",
        );
    });
    return () => {
      disposed = true;
      database.close();
      engine.current = null;
    };
  }, [retry]);

  useEffect(() => {
    if (initialQuery === lastProp.current) return;
    lastProp.current = initialQuery;
    if (!initialQuery?.trim() || !editor.current) return;
    if (editor.current.state.doc.toString() === lastLoaded.current)
      loadQuery(initialQuery);
    else setPendingQuery(initialQuery);
  }, [initialQuery, loadQuery]);

  async function resetDataset() {
    if (!engine.current || runningRef.current) return;
    const database = engine.current;
    runningRef.current = true;
    setRunning(true);
    try {
      await database.reset();
      if (engine.current !== database) return;
      setResult(null);
      setError("");
      setNotice("Dataset restored. Your SQL stays in the editor.");
    } catch (failure) {
      if (engine.current === database)
        setError(
          failure instanceof Error
            ? failure.message
            : "The dataset could not reset. Try again.",
        );
    } finally {
      if (engine.current === database) {
        runningRef.current = false;
        setRunning(false);
      }
    }
  }

  const rowCount =
    result?.results.reduce((total, table) => total + table.values.length, 0) ??
    0;

  return (
    <section
      className="widget sql-playground"
      aria-labelledby={`${schemaId}-title`}
    >
      <div className="widget-header sql-header">
        <div className="sql-title">
          <span className="sql-icon">
            <Terminal size={19} aria-hidden="true" />
          </span>
          <div>
            <h2 id={`${schemaId}-title`}>SQL playground</h2>
            <p className="muted">A real database. Room to experiment.</p>
          </div>
        </div>
        <span className="sql-local">
          <span aria-hidden="true" />
          SQLite · runs on your device
        </span>
      </div>

      <div className="sql-workspace">
        <aside className="sql-sidebar" aria-label="Practice database">
          <div className="sql-sidebar-label">
            <Database size={14} aria-hidden="true" /> PRACTICE DATABASE
          </div>
          <details className="sql-schema" open>
            <summary id={schemaId}>
              Tables & columns <span className="muted">6 tables</span>
            </summary>
            {Object.entries(SCHEMA).map(([table, columns]) => (
              <details key={table} className="sql-schema-table">
                <summary>
                  <span className="mono">{table}</span>
                  <span className="muted">{columns.length}</span>
                </summary>
                <ul>
                  {columns.map((column) => (
                    <li key={column} className="mono">
                      {column}
                      {column.endsWith("_id") ||
                      ["onum", "cnum", "snum"].includes(column) ? (
                        <span className="sql-column-hint"> key</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </details>
          <p className="sql-dataset-note muted">
            Includes NULLs, an unenrolled student, and a customer without
            orders. Singular Student, Course and Enrollment views are also
            available.
          </p>
          <button
            className="button sql-reset"
            onClick={resetDataset}
            disabled={!ready || running}
            title="Restore the original tables and sample rows"
          >
            <RotateCcw size={15} aria-hidden="true" /> Reset dataset
          </button>
        </aside>

        <div className="sql-main">
          <div className="sql-editor-toolbar">
            <label
              className="sql-example-label"
              htmlFor={`${schemaId}-examples`}
            >
              Load example
            </label>
            <select
              id={`${schemaId}-examples`}
              className="field sql-example-select"
              defaultValue=""
              onChange={(event) => {
                const example = EXAMPLES[Number(event.target.value)];
                if (example) loadQuery(example.query);
                event.target.value = "";
              }}
            >
              <option value="" disabled>
                Choose a query…
              </option>
              {EXAMPLES.map((example, index) => (
                <option key={example.name} value={index}>
                  {example.name}
                </option>
              ))}
            </select>
            <span className="sql-file-label mono">query.sql</span>
          </div>
          {pendingQuery && (
            <div className="sql-pending">
              <p>
                Your edited query is still here. A chapter example is ready.
              </p>
              <button
                className="button"
                onClick={() => loadQuery(pendingQuery)}
              >
                Load chapter example
              </button>
              <button className="button" onClick={() => setPendingQuery(null)}>
                Keep my query
              </button>
            </div>
          )}
          <div ref={editorHost} className="sql-editor" />
          <div className="sql-runbar">
            <p id={helpId} className="muted">
              <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to run · Tab leaves the editor
            </p>
            <button
              className="button primary sql-run"
              onClick={runQuery}
              disabled={!ready || running}
              title="Run SQL query (Ctrl+Enter or Command+Enter)"
            >
              {running || !ready ? (
                <LoaderCircle
                  size={16}
                  className="sql-loading"
                  aria-hidden="true"
                />
              ) : (
                <Play size={16} fill="currentColor" aria-hidden="true" />
              )}
              {running ? "Running…" : ready ? "Run query" : "Loading SQLite…"}
            </button>
          </div>

          <div
            className="sql-results"
            aria-label="Query results"
            aria-busy={running}
          >
            <div className="sql-result-heading">
              <h3>Results</h3>
              {result && (
                <span className="sql-result-meta mono">
                  <Check size={14} aria-hidden="true" /> {rowCount}{" "}
                  {rowCount === 1 ? "row" : "rows"} ·{" "}
                  {result.elapsedMs.toFixed(1)} ms
                </span>
              )}
            </div>
            {error ? (
              <div className="sql-error" role="alert">
                <strong>Let’s check that query.</strong>
                <p>{error}</p>
                {!ready ? (
                  <button
                    className="button"
                    onClick={() => setRetry((value) => value + 1)}
                  >
                    Retry loading SQLite
                  </button>
                ) : (
                  <button
                    className="button"
                    onClick={runQuery}
                    disabled={running}
                  >
                    Run again
                  </button>
                )}
              </div>
            ) : result ? (
              <>
                {result.results.length ? (
                  result.results.map((table, index) => (
                    <div
                      className="sql-table-wrap"
                      key={index}
                      tabIndex={0}
                      role="region"
                      aria-label={`Result set ${index + 1}`}
                    >
                      <table className="data-table sql-table">
                        <caption>
                          Result {index + 1} · {table.values.length}{" "}
                          {table.values.length === 1 ? "row" : "rows"}
                        </caption>
                        <thead>
                          <tr>
                            {table.columns.map((column, columnIndex) => (
                              <th scope="col" key={`${column}-${columnIndex}`}>
                                {column}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {table.values.slice(0, 250).map((row, rowIndex) => (
                            <tr key={rowIndex}>
                              {row.map((value, columnIndex) => (
                                <td key={columnIndex}>{displayCell(value)}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {table.values.length > 250 && (
                        <p className="muted sql-result-limit">
                          Showing the first 250 of {table.values.length} rows.
                          Add LIMIT to explore a smaller result.
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="sql-empty-result">
                    Statement completed. {result.rowsModified}{" "}
                    {result.rowsModified === 1 ? "row" : "rows"} changed.
                  </p>
                )}
                {result.results.length > 0 && result.rowsModified > 0 && (
                  <p className="muted sql-result-limit">
                    {result.rowsModified} rows changed by this script.
                  </p>
                )}
              </>
            ) : (
              <div className="sql-empty">
                <Database size={25} strokeWidth={1.3} aria-hidden="true" />
                <p>Your next discovery starts with a query.</p>
                <span className="muted">
                  Choose an example or write your own, then press Run query.
                </span>
              </div>
            )}
          </div>
          <p className="sql-dialect muted">
            SQLite dialect. Use COALESCE and EXCEPT; Oracle NVL / MINUS and ANY
            / ALL syntax are not supported here. Queries run in an isolated
            worker with a 5-second limit. Dataset changes last until reset,
            timeout, or you leave this page.
          </p>
        </div>
      </div>
      <span className="sql-sr-only" role="status" aria-live="polite">
        {notice}
      </span>
    </section>
  );
}
