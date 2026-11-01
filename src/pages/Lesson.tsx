import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  NavLink,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import {
  Flag,
  Check,
  BookOpen,
  Clock,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ArrowUpRight,
  Minus,
  Plus,
  Lightbulb,
  AlertTriangle,
  Terminal,
} from "lucide-react";
import { toast } from "sonner";
import { targets, references, useStudy, chapterStats } from "../lib/progress";
import { exampleQuery } from "../lib/lesson-tools";
import type { Chapter, Task } from "../data/types";
import { Button, Panel, Badge, Ring } from "../components/ui";
import CodeBlock from "../components/CodeBlock";
import SelfCheck from "../components/SelfCheck";
import "../lesson.css";
import course from "../data/course.json";
const chapters: Chapter[] = course.chapters;
const QuizPanel = lazy(() => import("../components/QuizPanel"));
const Flashcards = lazy(() => import("../components/Flashcards"));
const SqlPlayground = lazy(() => import("../widgets/SqlPlayground"));
const ErDiagram = lazy(() => import("../widgets/ErDiagram"));
const Normalization = lazy(() => import("../widgets/Normalization"));
const BPlusTree = lazy(() => import("../widgets/BPlusTree"));
const Transactions = lazy(() => import("../widgets/Transactions"));
const JoinVisualizer = lazy(() => import("../widgets/JoinVisualizer"));
function Formula({ formula }: { formula: string }) {
  const [html, setHtml] = useState("");
  useEffect(() => {
    let active = true;
    Promise.all([import("katex"), import("katex/dist/katex.min.css")]).then(
      ([katex]) => {
        if (active)
          setHtml(
            katex.default.renderToString(formula, {
              throwOnError: false,
              displayMode: true,
            }),
          );
      },
    );
    return () => {
      active = false;
    };
  }, [formula]);
  return html ? (
    <div className="formula" dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <pre className="formula">{formula}</pre>
  );
}
function toggleTaskCelebration(id: string, chapter: number, reduced: boolean) {
  const before = chapterStats(useStudy.getState().progress, chapter);
  useStudy.getState().toggleTask(id);
  const after = chapterStats(useStudy.getState().progress, chapter);
  if (before.percent < 100 && after.percent === 100) {
    toast.success("Chapter complete. That work adds up.");
    if (!reduced)
      import("canvas-confetti").then(({ default: confetti }) =>
        confetti({
          particleCount: 48,
          spread: 65,
          origin: { y: 0.75 },
          colors: ["#a2aaff", "#73e3ed", "#74dfad"],
          disableForReducedMotion: true,
        }),
      );
  }
}
function TaskRow({ task, chapter }: { task: Task; chapter: number }) {
  const checked = useStudy((s) => !!s.progress.tasks[task.id]),
    reduced = useReducedMotion();
  function change() {
    toggleTaskCelebration(task.id, chapter, !!reduced);
  }
  return (
    <label className={`task-row ${checked ? "is-checked" : ""}`}>
      <input
        type="checkbox"
        data-task={task.id}
        checked={checked}
        onChange={change}
      />
      <span className="task-check" aria-hidden="true">
        <motion.span
          animate={{ scale: checked ? [0.7, 1.15, 1] : 1 }}
          transition={{ duration: 0.2 }}
        >
          {checked && <Check size={13} />}
        </motion.span>
      </span>
      <span>{task.text}</span>
    </label>
  );
}
function Counter({ id }: { id: string }) {
  const target = targets.find((t) => t.id === id)!,
    value = useStudy((s) => s.progress.counts[id] ?? 0),
    count = useStudy((s) => s.count);
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  function commit() {
    const n = Number(draft);
    if (
      draft.trim() !== "" &&
      Number.isInteger(n) &&
      n >= 0 &&
      n <= target.target
    )
      count(id, n);
    else {
      setDraft(String(value));
      toast.error(`Enter a whole number between 0 and ${target.target}.`);
    }
  }
  return (
    <div className="practice-counter">
      <div className="row between">
        <label htmlFor={"count-" + id}>{target.title}</label>
        <span className="mono">
          {value} / {target.target}
        </span>
      </div>
      <div className="row">
        <div className="counter-controls">
          <Button
            aria-label={`Subtract one ${target.title}`}
            disabled={!value}
            onClick={() => count(id, value - 1)}
          >
            <Minus size={13} />
          </Button>
          <input
            id={"count-" + id}
            type="number"
            min={0}
            max={target.target}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
            }}
          />
          <Button
            aria-label={`Add one ${target.title}`}
            disabled={value >= target.target}
            onClick={() => count(id, value + 1)}
          >
            <Plus size={13} />
          </Button>
        </div>
        <div className="progress-track">
          <span style={{ width: (value / target.target) * 100 + "%" }} />
        </div>
      </div>
    </div>
  );
}
function Checklist({ chapter: c }: { chapter: Chapter }) {
  const reduced = useReducedMotion();
  const progress = useStudy((s) => s.progress),
    note = useStudy((s) => s.note),
    saving = useStudy((s) => s.saving);
  const [filter, setFilter] = useState("all");
  const stats = chapterStats(progress, c.id),
    visible = (task: Task) =>
      filter === "all" ||
      (filter === "pending"
        ? !progress.tasks[task.id]
        : progress.tasks[task.id]);
  const ordinary = c.tasks.filter((t) => t.kind !== "Watch" && visible(t));
  return (
    <div className="checklist-layout">
      <div className="stack">
        <Panel className="checklist-panel">
          <div className="row between">
            <div>
              <h2>Chapter checklist</h2>
              <p className="small-copy">Check after doing. Uncheck anytime.</p>
            </div>
            <Ring value={stats.percent} size={52} />
          </div>
          <div className="checklist-progress">
            <span>
              {stats.done} / {stats.total} checked
            </span>
            <div className="progress-track">
              <span style={{ width: stats.percent + "%" }} />
            </div>
          </div>
          <div className="checklist-filter">
            <label htmlFor="task-filter">Show</label>
            <select
              id="task-filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All actions</option>
              <option value="pending">Unchecked</option>
              <option value="done">Checked</option>
            </select>
          </div>
          {ordinary.length ? (
            [...new Set(ordinary.map((t) => t.kind))].map((kind) => (
              <section className="task-group" key={kind}>
                <h3>
                  {(
                    {
                      Learn: "Understand",
                      Recall: "Explain without notes",
                      Review: "Review & verify",
                      Lab: "Lab checklist",
                      Project: "Project evidence",
                    } as Record<string, string>
                  )[kind] ?? "Independent practice"}
                </h3>
                {ordinary
                  .filter((t) => t.kind === kind)
                  .map((task) => (
                    <TaskRow key={task.id} task={task} chapter={c.id} />
                  ))}
              </section>
            ))
          ) : (
            <p className="empty">No actions in this filter.</p>
          )}
        </Panel>
        {c.weeks && (
          <Panel>
            <h2>127-video watching checklist</h2>
            <p className="small-copy">
              Numbers follow the handbook assignment. Open a week to check
              individual lectures. Revisit 117–118 during Week 8; their boxes
              are counted once in Week 7. Week 9 has project/lab tasks above.
            </p>
            <p className="resource-inline">
              <a
                href="https://www.gatesmashers.com/roadmaps/dbms-sql"
                target="_blank"
                rel="noreferrer"
              >
                Open source roadmap <ArrowUpRight size={12} />
              </a>
              <a
                href="https://www.youtube.com/playlist?list=PLxCzCOWd7aiFAN6I8CuViBuCdJgiOkT2Y"
                target="_blank"
                rel="noreferrer"
              >
                Open playlist <ArrowUpRight size={12} />
              </a>
            </p>
            <div className="video-weeks">
              {c.weeks.map((w) => {
                const tasks = w.groups
                  .flatMap((g) => g.ids)
                  .map((id) => c.tasks.find((t) => t.id === id)!);
                return (
                  <details key={w.number} className="video-week">
                    <summary>
                      <div>
                        <span>Week {w.number}</span>
                        <strong>{w.title}</strong>
                      </div>
                      <small>
                        {tasks.filter((t) => progress.tasks[t.id]).length}/
                        {tasks.length} watched
                      </small>
                      <ChevronDown size={16} />
                    </summary>
                    {w.groups.map((g) => (
                      <section key={g.title}>
                        <h4>{g.title}</h4>
                        <div className="video-grid">
                          {g.ids
                            .map((id) => c.tasks.find((t) => t.id === id)!)
                            .filter(visible)
                            .map((t) => (
                              <label
                                className={
                                  progress.tasks[t.id] ? "watched" : ""
                                }
                                key={t.id}
                              >
                                <input
                                  type="checkbox"
                                  data-task={t.id}
                                  checked={!!progress.tasks[t.id]}
                                  onChange={() =>
                                    toggleTaskCelebration(t.id, c.id, !!reduced)
                                  }
                                />
                                <span>{t.id.replace("video-", "")}</span>
                                <span className="sr-only">{t.text}</span>
                              </label>
                            ))}
                        </div>
                      </section>
                    ))}
                  </details>
                );
              })}
            </div>
          </Panel>
        )}
        <Panel className="practice-prompt">
          <Lightbulb size={20} />
          <div>
            <h3>Put it into practice</h3>
            <p>{c.practice}</p>
          </div>
        </Panel>
      </div>
      <aside className="notes-aside">
        <Panel>
          <h3>Evidence & notes</h3>
          <p className="small-copy">
            Record what you built, filenames, results and what to revisit. Plain
            text only.
          </p>
          <label className="sr-only" htmlFor="chapter-notes">
            Chapter notes
          </label>
          <textarea
            id="chapter-notes"
            maxLength={20000}
            value={progress.notes[c.id] ?? ""}
            onChange={(e) => note(c.id, e.target.value)}
            placeholder="What clicked? What needs another look?"
            rows={9}
          />
          <p className="note-status">
            {saving
              ? "Saved in this browser when you type."
              : "Session only. Enable browser saving or download a backup."}
          </p>
        </Panel>
        {targets.some((t) => c.id === 12 || t.chapter === c.id) && (
          <Panel>
            <h3>Practice log</h3>
            <p className="small-copy">
              Cumulative totals. Count each distinct problem once; these totals
              do not auto-check actions.
            </p>
            {targets
              .filter((t) => c.id === 12 || t.chapter === c.id)
              .map((t) => (
                <Counter key={t.id} id={t.id} />
              ))}
          </Panel>
        )}
        <div className="study-method">
          <span className="mono">The study loop</span>
          <p>
            Read or watch → close the source → explain from memory → solve a
            fresh problem → save evidence → check the action.
          </p>
          <p>
            Use “Needs review” to flag gaps even after checking every action.
          </p>
        </div>
      </aside>
    </div>
  );
}
function References() {
  return (
    <section className="reference-directory">
      <h2>Handbook resource directory</h2>
      <p className="small-copy">
        Links transcribed from the supplied handbook. Their availability,
        lecture order and curriculum details have not been freshly verified.
        These links open online.
      </p>
      <div>
        {references.map(([title, url]) => (
          <a key={url} href={url} target="_blank" rel="noopener noreferrer">
            {title}
            <ArrowUpRight size={14} />
          </a>
        ))}
      </div>
    </section>
  );
}
function Learn({ chapter: c }: { chapter: Chapter }) {
  const [active, setActive] = useState(0),
    [search] = useSearchParams(),
    nav = useNavigate();
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting)
            setActive(Number((entry.target as HTMLElement).dataset.topic));
      },
      { rootMargin: "-100px 0px -60% 0px" },
    );
    root.current
      ?.querySelectorAll("[data-topic]")
      .forEach((el) => observer.observe(el));
    const topic = search.get("topic");
    if (topic !== null)
      setTimeout(
        () =>
          document
            .getElementById("topic-" + topic)
            ?.scrollIntoView({ behavior: "instant" }),
        100,
      );
    return () => observer.disconnect();
  }, [c.id, search]);
  const lang = [4, 9].includes(c.id)
    ? "sql"
    : c.id === 10
      ? "javascript"
      : "text";
  return (
    <div className="lesson-layout" ref={root}>
      <article className="lesson-article">
        <div className="lesson-kicker">
          <BookOpen size={14} />
          The chapter in focus
        </div>
        {c.learn.map(([title, text], i) => (
          <section
            className="learn-section"
            id={"topic-" + i}
            data-topic={i}
            key={title}
          >
            <div className="topic-number">
              {String(i + 1).padStart(2, "0")} /{" "}
              {String(c.learn.length).padStart(2, "0")}
            </div>
            <h2>{title}</h2>
            {i !== 0 && <p>{text}</p>}
            {i === 0 && (
              <div className="callout definition">
                <BookOpen size={16} />
                <div>
                  <strong>Definition</strong>
                  <p>{c.learn[0][1]}</p>
                </div>
              </div>
            )}
            {i === 1 && (
              <div className="callout key-idea">
                <Lightbulb size={16} />
                <div>
                  <strong>Key idea</strong>
                  <p>{c.recall[0]}</p>
                </div>
              </div>
            )}
          </section>
        ))}
        {c.id === 3 && (
          <div className="math-panel">
            <span>Relational algebra, in symbols</span>
            <Formula
              formula={"\\pi_{name}(\\sigma_{department=\\text{CSE}}(Student))"}
            />
            <p>Select the CSE students, then project their names.</p>
          </div>
        )}
        {c.id === 5 && (
          <div className="math-panel">
            <span>Functional dependency closure</span>
            <Formula
              formula={
                "A \\to B,\\; B \\to C \\implies A^+ \\supseteq \\{A,B,C\\}"
              }
            />
          </div>
        )}
        <section
          id="worked-example"
          className="learn-section"
          data-topic={c.learn.length}
        >
          <h2>Worked example</h2>
          <CodeBlock code={c.example} language={lang} highlightLines={[1]} />
          {[4, 9].includes(c.id) && (
            <Button onClick={() => nav(`/chapter/${c.id}/lab?example=1`)}>
              <Terminal />
              Try this query
            </Button>
          )}
          {c.id === 10 && (
            <p className="small-copy">
              MongoDB examples are study material. The SQL playground runs
              SQLite.
            </p>
          )}
        </section>
        <div className="callout exam-tip">
          <Lightbulb size={16} />
          <div>
            <strong>Exam tip: practise without the source</strong>
            <p>{c.practice}</p>
          </div>
        </div>
        <details className="go-deeper">
          <summary>
            Go deeper: recall without notes <ChevronDown size={16} />
          </summary>
          <h3>{c.recall[0]}</h3>
          <p>{c.recall[1]}</p>
        </details>
        <div className="callout common-mistake">
          <AlertTriangle size={16} />
          <div>
            <strong>Common mistake</strong>
            <p>
              Recognizing an explanation is not the same as being able to
              reproduce it. Close the notes and try the recall prompt before
              checking your answer.
            </p>
          </div>
        </div>
        <SelfCheck id={c.id} />
        {c.id === 13 && <References />}
        <div className="lesson-test-cta">
          <div>
            <h3>Ready to check your understanding?</h3>
            <p>Two questions. Think it through.</p>
          </div>
          <Button
            variant="primary"
            onClick={() => nav(`/chapter/${c.id}/quiz`)}
          >
            Start chapter quiz <ArrowRight />
          </Button>
        </div>
      </article>
      <aside className="toc">
        <span>On this page</span>
        {[...c.learn.map(([title]) => title), "Worked example"].map(
          (title, i) => (
            <button
              key={title}
              onClick={() =>
                document
                  .getElementById(
                    i === c.learn.length ? "worked-example" : "topic-" + i,
                  )
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className={active === i ? "active" : ""}
            >
              {title}
            </button>
          ),
        )}
        <div className="toc-note">
          <Clock size={14} />
          {Math.max(
            2,
            Math.ceil(
              c.learn
                .map((x) => x.join(" "))
                .join(" ")
                .split(" ").length / 180,
            ),
          )}{" "}
          min read
        </div>
      </aside>
    </div>
  );
}
function Lab({ chapter: c }: { chapter: Chapter }) {
  const [search] = useSearchParams();
  const unlock = useStudy((s) => s.unlock);
  const snippet = search.get("example") ? exampleQuery(c.example) : undefined;
  return (
    <div className="stack">
      <div className="lab-intro">
        <Badge>Interactive lab</Badge>
        <h2>Make the idea tangible.</h2>
        <p>Experiment here. Your checklist stays yours to complete.</p>
      </div>
      <Suspense
        fallback={
          <div className="skeleton" aria-label="Loading interactive lab" />
        }
      >
        {[4, 9].includes(c.id) ? (
          <SqlPlayground
            initialQuery={snippet}
            onQuerySuccess={() => unlock("first-query")}
          />
        ) : c.id === 2 ? (
          <ErDiagram />
        ) : c.id === 5 ? (
          <Normalization onComplete={() => unlock("normalization")} />
        ) : c.id === 6 ? (
          <BPlusTree />
        ) : c.id === 8 ? (
          <Transactions />
        ) : c.id === 3 || c.id === 7 ? (
          <JoinVisualizer />
        ) : (
          <>
            <SelfCheck id={c.id} />
            <Panel>
              <h3>Independent practice</h3>
              <p style={{ margin: "16px 0" }}>{c.practice}</p>
              <CodeBlock
                code={c.example}
                language={c.id === 10 ? "javascript" : "text"}
              />
            </Panel>
          </>
        )}
      </Suspense>
    </div>
  );
}
export default function Lesson() {
  const { id: raw, tab = "checklist" } = useParams(),
    id = Number(raw),
    c = chapters.find((c) => c.id === id),
    nav = useNavigate(),
    progress = useStudy((s) => s.progress),
    review = useStudy((s) => s.review);
  const [reading, setReading] = useState(0);
  useEffect(() => {
    if (c) useStudy.getState().remember(c.id);
  }, [c]);
  useEffect(() => {
    const on = () => {
      const total = document.documentElement.scrollHeight - innerHeight;
      setReading(total ? Math.min(100, (scrollY / total) * 100) : 0);
    };
    window.addEventListener("scroll", on, { passive: true });
    on();
    return () => window.removeEventListener("scroll", on);
  }, [id, tab]);
  if (!c)
    return (
      <div className="empty">
        <h1>Chapter not found</h1>
        <p>Choose one of the 13 chapters from your learning path.</p>
        <Button onClick={() => nav("/")}>Back to overview</Button>
      </div>
    );
  const labels = [
    ["checklist", "Checklist"],
    ["learn", "Lesson"],
    ["lab", "Interactive lab"],
    ["quiz", "Quiz"],
    ["cards", "Flashcards"],
    ["source", "Handbook text"],
  ];
  return (
    <>
      <div className="reading-progress" aria-hidden="true">
        <span style={{ transform: `scaleX(${reading / 100})` }} />
      </div>
      <header className="chapter-header">
        <div className="row wrap">
          <Badge>Chapter {String(id).padStart(2, "0")} / 13</Badge>
          <span className="chapter-pages">
            Handbook pp. {c.pages[0]}–{c.pages[1]}
          </span>
        </div>
        <div className="chapter-heading-row">
          <div>
            <h1>{c.title}</h1>
            <p>{c.intro}</p>
          </div>
          <Button
            className={progress.reviews[id] ? "review-active" : ""}
            onClick={() => review(id)}
            aria-pressed={!!progress.reviews[id]}
          >
            <Flag />
            {progress.reviews[id] ? "Needs review" : "Flag for review"}
          </Button>
        </div>
      </header>
      <nav className="lesson-tabs" aria-label="Chapter sections">
        {labels.map(([key, title]) => (
          <NavLink key={key} to={`/chapter/${id}/${key}`}>
            {title}
            {key === "checklist" && (
              <span>
                {chapterStats(progress, id).done}/{c.tasks.length}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="chapter-body">
        <Suspense fallback={<div className="skeleton" />}>
          {tab === "checklist" ? (
            <Checklist key={id} chapter={c} />
          ) : tab === "learn" ? (
            <Learn key={id} chapter={c} />
          ) : tab === "lab" ? (
            <Lab key={id} chapter={c} />
          ) : tab === "quiz" ? (
            <QuizPanel key={id} chapter={c} />
          ) : tab === "cards" ? (
            <Flashcards key={id} chapter={c} />
          ) : tab === "source" ? (
            <div className="source-layout">
              <div className="section-heading">
                <div>
                  <h2>Source chapter text</h2>
                  <p>
                    Extracted from the supplied PDF, pages {c.pages[0]}–
                    {c.pages[1]}. Tables appear as plain text. Use the original
                    PDF for the designed page layout.
                  </p>
                </div>
                <Badge>Original wording</Badge>
              </div>
              <div className="source-text">{c.sourceText}</div>
              {id === 13 && <References />}
            </div>
          ) : (
            <Learn chapter={c} />
          )}
        </Suspense>
      </div>
      <nav
        className="chapter-pagination"
        aria-label="Previous and next chapters"
      >
        {[id - 1, id + 1].map((next, i) => {
          const chapter = chapters.find((c) => c.id === next);
          return (
            <button
              key={i}
              onClick={() => nav(chapter ? `/chapter/${next}/checklist` : "/")}
              className={i ? "next" : ""}
            >
              <span>{i ? "Next chapter" : "Previous chapter"}</span>
              <strong>
                {i ? (
                  <>
                    {chapter?.title ?? "Back to overview"}
                    <ArrowRight size={16} />
                  </>
                ) : (
                  <>
                    <ArrowLeft size={16} />
                    {chapter?.title ?? "Overview"}
                  </>
                )}
              </strong>
              <small>
                {chapter?.intro ?? "Return to your complete learning path."}
              </small>
            </button>
          );
        })}
      </nav>
    </>
  );
}
