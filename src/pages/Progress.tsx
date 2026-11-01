import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  ArrowRight,
  Award,
  CalendarDays,
  Check,
  CheckCheck,
  Database,
  Flame,
  Layers3,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { chapters, chapterStats, useStudy } from "../lib/progress";
import { Badge, Button, Panel, Ring } from "../components/ui";
import Flashcards from "../components/Flashcards";
import "../progress.css";

const achievements = [
  {
    id: "first-step",
    title: "First step",
    description: "Complete your first checklist action.",
    icon: Check,
  },
  {
    id: "first-query",
    title: "Query explorer",
    description: "Run a query in the SQL playground.",
    icon: Database,
  },
  {
    id: "chapter-complete",
    title: "Chapter closed",
    description: "Complete every action in a chapter.",
    icon: CheckCheck,
  },
  {
    id: "normalization",
    title: "Schema refiner",
    description: "Explore the normalization stages.",
    icon: Layers3,
  },
  {
    id: "quiz-perfect",
    title: "Clear understanding",
    description: "Answer every question in a chapter quiz correctly.",
    icon: Award,
  },
];
const localDay = (date: Date) => date.toLocaleDateString("en-CA");
function activityDays(activity: Record<string, number>) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Array.from({ length: 84 }, (_, index) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (83 - index));
    const key = localDay(date);
    return { date, key, count: activity[key] ?? 0 };
  });
}
function streak(activity: Record<string, number>) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  if (!activity[localDay(date)]) date.setDate(date.getDate() - 1);
  let days = 0;
  while (activity[localDay(date)] > 0) {
    days++;
    date.setDate(date.getDate() - 1);
  }
  return days;
}
export default function Progress() {
  const progress = useStudy((state) => state.progress);
  const saving = useStudy((state) => state.saving);
  const reducedMotion = useReducedMotion();
  const navigate = useNavigate();
  const stats = chapterStats(progress, 0);
  const completedChapters = chapters.filter(
    (chapter) => chapterStats(progress, chapter.id).percent === 100,
  ).length;
  const days = activityDays(progress.extras.activity);
  const activityCount = days.reduce((sum, day) => sum + day.count, 0);
  const activeDays = days.filter((day) => day.count > 0).length;
  const currentStreak = streak(progress.extras.activity);
  const history = progress.extras.history
    .slice(-20)
    .map((attempt, index) => ({
      ...attempt,
      attempt: index + 1,
      percentage: Math.round((attempt.score / attempt.total) * 100),
      label: `Chapter ${attempt.chapter}: ${chapters.find((chapter) => chapter.id === attempt.chapter)?.title ?? ""}`,
    }));
  const firstAnswers = chapters.flatMap((chapter) =>
    chapter.quiz.map((question, index) => ({
      question,
      answer: progress.quizzes[`${chapter.id}-${index}`],
    })),
  );
  const attempted = firstAnswers.filter((item) => item.answer).length;
  const correct = firstAnswers.filter(
    (item) => item.answer?.first === item.question.correct,
  ).length;
  return (
    <div className="progress-page">
      <header className="section-heading">
        <div>
          <Badge>
            <Target size={13} />
            YOUR LEARNING, VISIBLE
          </Badge>
          <h1>Small steps add up.</h1>
          <p>
            A record of what you have done, and a clear view of what comes next.
          </p>
        </div>
        <Button onClick={() => navigate("/data")}>
          <ShieldCheck size={16} />
          Data & backups
          <ArrowRight size={16} />
        </Button>
      </header>
      <section
        className="progress-overview"
        aria-label="Overall study progress"
      >
        <Panel className="overall-progress">
          <Ring
            value={stats.percent}
            size={112}
            label={`${stats.percent}% of checklist actions complete`}
          />
          <div>
            <span className="mono muted">YOUR COMPLETION</span>
            <h2>
              {stats.done}
              <span> / {stats.total} actions</span>
            </h2>
            <p>
              {completedChapters} of {chapters.length} chapters complete
            </p>
          </div>
        </Panel>
        <Panel className="progress-metric">
          <Flame size={20} />
          <strong>
            {currentStreak}
            <span> {currentStreak === 1 ? "day" : "days"}</span>
          </strong>
          <span>Current streak</span>
          <small>
            {currentStreak
              ? "A little practice, consistently."
              : "Do one action today to begin."}
          </small>
        </Panel>
        <Panel className="progress-metric">
          <Sparkles size={20} />
          <strong>
            {attempted ? `${Math.round((correct / attempted) * 100)}%` : "—"}
          </strong>
          <span>First-attempt accuracy</span>
          <small>
            {attempted
              ? `${correct} correct of ${attempted} answered`
              : "Try a chapter quiz to start."}
          </small>
        </Panel>
      </section>
      {stats.done === 0 && activityCount === 0 && (
        <Panel className="progress-first-step">
          <div>
            <h3>Build your first bit of momentum.</h3>
            <p>
              Open a chapter, work through one action, then check it off. Your
              progress will appear here.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => navigate("/chapter/1/checklist")}
          >
            Start with foundations
            <ArrowRight size={16} />
          </Button>
        </Panel>
      )}
      <div className="progress-columns">
        <Panel className="chapter-progress">
          <div className="section-heading">
            <div>
              <h2>The chapter view</h2>
              <p>Checklist completion across the full course.</p>
            </div>
            <span className="mono muted">{completedChapters} / 13</span>
          </div>
          <div className="chapter-progress-rows">
            {chapters.map((chapter) => {
              const chapterProgress = chapterStats(progress, chapter.id);
              return (
                <button
                  key={chapter.id}
                  className="chapter-progress-row"
                  onClick={() => navigate(`/chapter/${chapter.id}/checklist`)}
                >
                  <span className="chapter-progress-number">
                    {String(chapter.id).padStart(2, "0")}
                  </span>
                  <span className="chapter-progress-details">
                    <span>{chapter.title}</span>
                    <span className="progress-track">
                      <span style={{ width: `${chapterProgress.percent}%` }} />
                    </span>
                  </span>
                  <span className="chapter-progress-value">
                    {chapterProgress.percent === 100 ? (
                      <>
                        <Check size={16} />
                        <span className="sr-only">Complete</span>
                      </>
                    ) : (
                      `${chapterProgress.done}/${chapterProgress.total}`
                    )}
                  </span>
                  <ArrowRight size={13} />
                </button>
              );
            })}
          </div>
        </Panel>
        <div className="progress-right">
          <Panel className="activity-panel">
            <div className="section-heading">
              <div>
                <h2>Keep showing up.</h2>
                <p>
                  {activityCount} {activityCount === 1 ? "action" : "actions"}{" "}
                  across {activeDays} active {activeDays === 1 ? "day" : "days"}{" "}
                  in 12 weeks.
                </p>
              </div>
              <CalendarDays size={18} className="muted" />
            </div>
            <div className="activity-grid-wrap">
              <div className="activity-weekdays" aria-hidden="true">
                {days.slice(0, 7).map((day) => (
                  <span key={day.key}>
                    {day.date
                      .toLocaleDateString(undefined, { weekday: "short" })
                      .slice(0, 1)}
                  </span>
                ))}
              </div>
              <div
                className="activity-grid"
                role="group"
                aria-label="Study activity over the past 84 days"
              >
                {days.map((day) => (
                  <div
                    key={day.key}
                    role="img"
                    className={`activity-day level-${day.count === 0 ? 0 : day.count < 3 ? 1 : day.count < 6 ? 2 : day.count < 10 ? 3 : 4}`}
                    aria-label={`${day.date.toLocaleDateString(undefined, { dateStyle: "long" })}: ${day.count} ${day.count === 1 ? "action" : "actions"}`}
                    title={`${day.key}: ${day.count} actions`}
                  />
                ))}
              </div>
            </div>
            <div className="activity-range">
              <time dateTime={days[0].key}>
                {days[0].date.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </time>
              <span>
                Less
                <span className="activity-day level-0" />
                <span className="activity-day level-2" />
                <span className="activity-day level-4" />
                More
              </span>
              <time dateTime={days[83].key}>Today</time>
            </div>
            <p className="progress-small-note">
              Actions include checklist changes, practice counts, quiz answers,
              and card reviews. A streak continues if you studied today or
              yesterday.
            </p>
          </Panel>
          <Panel className="quiz-trend-panel">
            <div className="section-heading">
              <div>
                <h2>Recall over time.</h2>
                <p>
                  {history.length
                    ? "Your most recent completed quiz attempts."
                    : "Completed quizzes will build your trend."}
                </p>
              </div>
            </div>
            {history.length ? (
              <>
                <div
                  className="quiz-trend-chart"
                  role="img"
                  aria-label={`Last ${history.length} quiz scores: ${history.map((item) => `${item.score} out of ${item.total}`).join(", ")}`}
                >
                  <ResponsiveContainer width="100%" height={190}>
                    <LineChart
                      data={history}
                      margin={{ top: 10, right: 14, bottom: 2, left: -22 }}
                      accessibilityLayer
                    >
                      <CartesianGrid stroke="var(--border)" vertical={false} />
                      <XAxis
                        dataKey="attempt"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "var(--muted)", fontSize: 10 }}
                        minTickGap={22}
                      />
                      <YAxis
                        domain={[0, 100]}
                        ticks={[0, 50, 100]}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "var(--muted)", fontSize: 10 }}
                        unit="%"
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          fontSize: 11,
                          color: "var(--foreground)",
                        }}
                        labelFormatter={(_, payload) =>
                          payload[0]?.payload?.label ?? "Quiz attempt"
                        }
                        formatter={(value) => [`${value}%`, "Accuracy"]}
                      />
                      <Line
                        type="linear"
                        dataKey="percentage"
                        stroke="var(--accent)"
                        strokeWidth={2}
                        dot={{ r: 3, fill: "var(--accent)" }}
                        activeDot={{ r: 5 }}
                        isAnimationActive={!reducedMotion}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <details className="quiz-history-details">
                  <summary>Read quiz attempt data</summary>
                  <ol>
                    {history.map((item) => (
                      <li key={`${item.at}-${item.attempt}`}>
                        <time dateTime={item.at}>
                          {new Date(item.at).toLocaleDateString()}
                        </time>{" "}
                        · Chapter {item.chapter} · {item.score}/{item.total}
                      </li>
                    ))}
                  </ol>
                </details>
              </>
            ) : (
              <div className="quiz-trend-empty">
                <Target size={26} />
                <p>Understanding grows through retrieval.</p>
                <span>
                  Take a two-question chapter quiz to record your first score.
                </span>
                <Button
                  onClick={() =>
                    navigate(`/chapter/${progress.extras.lastChapter}/quiz`)
                  }
                >
                  Try a quiz
                  <ArrowRight size={14} />
                </Button>
              </div>
            )}
          </Panel>
        </div>
      </div>
      <Panel className="achievements-panel">
        <div className="section-heading">
          <div>
            <h2>Milestones along the way.</h2>
            <p>Small markers of work you have actually done.</p>
          </div>
          <Badge>
            {
              achievements.filter((item) =>
                progress.extras.achievements.includes(item.id),
              ).length
            }{" "}
            / {achievements.length} unlocked
          </Badge>
        </div>
        <div className="achievement-grid">
          {achievements.map(({ id, title, description, icon: Icon }, index) => {
            const unlocked = progress.extras.achievements.includes(id);
            return (
              <motion.div
                key={`${id}-${unlocked}`}
                className={`achievement ${unlocked ? "unlocked" : "locked"}`}
                initial={
                  reducedMotion || !unlocked
                    ? false
                    : { opacity: 0, y: 8, scale: 0.96 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 0.25,
                  delay: reducedMotion ? 0 : index * 0.035,
                }}
              >
                <span className="achievement-icon">
                  {unlocked ? <Icon size={21} /> : <LockKeyhole size={19} />}
                </span>
                <strong>{title}</strong>
                <p>{description}</p>
                <span className="achievement-state">
                  {unlocked ? (
                    <>
                      <Check size={11} />
                      Unlocked
                    </>
                  ) : (
                    "Still ahead"
                  )}
                </span>
              </motion.div>
            );
          })}
        </div>
      </Panel>
      <Panel>
        <Flashcards />
      </Panel>
      <p className="progress-saving-note">
        <ShieldCheck size={13} />
        {saving
          ? "Saving is enabled. Your progress stays in this browser; export a backup to keep another copy."
          : "Saving is off. Your progress stays in this session; enable saving in Data to keep it after a reload."}
        <button className="text-link" onClick={() => navigate("/data")}>
          Manage your data
        </button>
      </p>
    </div>
  );
}
