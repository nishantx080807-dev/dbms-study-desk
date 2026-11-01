import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  BookOpen,
  Check,
  Clock3,
  Layers3,
  RotateCcw,
  RotateCw,
} from "lucide-react";
import { chapters, useStudy } from "../lib/progress";
import type { Chapter } from "../data/types";
import { Badge, Button } from "./ui";
import "../progress.css";

export default function Flashcards({ chapter }: { chapter?: Chapter }) {
  const progress = useStudy((state) => state.progress);
  const card = useStudy((state) => state.card);
  const saving = useStudy((state) => state.saving);
  const reducedMotion = useReducedMotion();
  const [flipped, setFlipped] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [reviewed, setReviewed] = useState<number[]>([]);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    setFlipped(false);
    setReviewed([]);
    setNotice("");
  }, [chapter?.id]);
  const available = chapter ? [chapter] : chapters;
  const now = Date.now();
  const due = available.filter(
    (item) =>
      !progress.extras.cards[item.id] ||
      Date.parse(progress.extras.cards[item.id].due) <= now,
  );
  const queue = (showAll ? available : due).filter(
    (item) => !reviewed.includes(item.id),
  );
  const current = queue[0];
  const nextDue = available
    .map((item) => progress.extras.cards[item.id]?.due)
    .filter((date): date is string => !!date && Date.parse(date) > now)
    .sort((left, right) => Date.parse(left) - Date.parse(right))[0];
  function grade(known: boolean) {
    if (!current) return;
    card(current.id, known);
    const schedule = useStudy.getState().progress.extras.cards[current.id];
    setNotice(
      `${current.title}: ${known ? "remembered" : "scheduled for another look"}. Box ${schedule.box}, next review ${new Date(schedule.due).toLocaleDateString(undefined, { month: "short", day: "numeric" })}.`,
    );
    setReviewed((previous) => [...previous, current.id]);
    setFlipped(false);
  }
  return (
    <section className="flashcards" aria-label="Spaced repetition flashcards">
      <div className="section-heading">
        <div>
          <h2>Recall before you reveal.</h2>
          <p>
            One original recall question per chapter. Say your answer first.
          </p>
        </div>
        <Badge>
          <Layers3 size={13} />
          {due.length} due
        </Badge>
      </div>
      <div className="flashcard-toolbar">
        <label className="flashcard-all-toggle">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(event) => {
              setShowAll(event.target.checked);
              setReviewed([]);
              setFlipped(false);
              setNotice("");
            }}
          />
          Show all cards, including upcoming reviews
        </label>
        <span className="mono muted">
          {reviewed.length} reviewed this session
        </span>
      </div>
      {current ? (
        <>
          <div className="flashcard-meta">
            <span>
              CHAPTER {String(current.id).padStart(2, "0")} · {current.title}
            </span>
            <span>Box {progress.extras.cards[current.id]?.box ?? 1} / 5</span>
          </div>
          <div className="flashcard-perspective">
            <motion.button
              key={current.id}
              type="button"
              className="flashcard"
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{
                duration: reducedMotion ? 0 : 0.48,
                ease: [0.22, 0.8, 0.2, 1],
              }}
              onClick={() => setFlipped((value) => !value)}
              aria-pressed={flipped}
            >
              <span
                className="flashcard-face flashcard-front"
                aria-hidden={flipped}
              >
                <span className="flashcard-face-label">
                  <BookOpen size={15} />
                  THE QUESTION
                </span>
                <span className="flashcard-question">{current.recall[0]}</span>
                <span className="flashcard-flip-hint">
                  <RotateCw size={14} />
                  Click or press Enter to reveal
                </span>
              </span>
              <span
                className="flashcard-face flashcard-back"
                aria-hidden={!flipped}
              >
                <span className="flashcard-face-label">
                  <Check size={15} />
                  THE EXPLANATION
                </span>
                <span className="flashcard-answer">{current.recall[1]}</span>
                <span className="flashcard-flip-hint">
                  <RotateCw size={14} />
                  Click to return to the question
                </span>
              </span>
            </motion.button>
          </div>
          <div className="flashcard-actions">
            <Button disabled={!flipped} onClick={() => grade(false)}>
              <RotateCcw size={16} />
              Study again
            </Button>
            <span className="muted">
              {flipped
                ? "How well did you recall it?"
                : "Reveal the answer to rate your recall."}
            </span>
            <Button
              variant="primary"
              disabled={!flipped}
              onClick={() => grade(true)}
            >
              I know this
              <ArrowRight size={16} />
            </Button>
          </div>
        </>
      ) : (
        <div className="flashcard-empty">
          <Check size={28} />
          <h3>
            {reviewed.length
              ? "A good moment to let it settle."
              : "Your review queue is clear."}
          </h3>
          <p>
            {reviewed.length
              ? `You reviewed ${reviewed.length} ${reviewed.length === 1 ? "card" : "cards"} this session.`
              : "Your upcoming cards will return when they are due."}
          </p>
          {nextDue && (
            <p>
              <Clock3 size={14} />
              Next review:{" "}
              {new Date(nextDue).toLocaleDateString(undefined, {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </p>
          )}
          <Button
            onClick={() => {
              setReviewed([]);
              setShowAll(true);
              setFlipped(false);
            }}
          >
            Practice all {available.length}{" "}
            {available.length === 1 ? "card" : "cards"}
            <ArrowRight size={16} />
          </Button>
        </div>
      )}
      <p className="flashcard-notice" role="status">
        {notice}
      </p>
      <div className="leitner-boxes" aria-label="Leitner box distribution">
        {[1, 2, 3, 4, 5].map((box) => {
          const count = available.filter(
            (item) => (progress.extras.cards[item.id]?.box ?? 1) === box,
          ).length;
          return (
            <div key={box} className={count ? "has-cards" : ""}>
              <span>BOX {box}</span>
              <strong>{count}</strong>
              <small>
                {[1, 2, 4, 8, 16][box - 1]} day{box > 1 ? "s" : ""}
              </small>
            </div>
          );
        })}
      </div>
      <p className="flashcard-storage muted">
        Remembered cards move up one box; study again returns them to Box 1.{" "}
        {saving
          ? "Review schedules save in this browser."
          : "Review schedules last for this session. Enable saving in Data to keep them."}
      </p>
    </section>
  );
}
