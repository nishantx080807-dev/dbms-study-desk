import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  RotateCcw,
  X,
  XCircle,
} from "lucide-react";
import type { Chapter } from "../data/types";
import { useStudy } from "../lib/progress";
import { Badge, Button, Panel, Ring } from "./ui";
import "../quiz.css";

export default function QuizPanel({ chapter }: { chapter: Chapter }) {
  return <QuizSession key={chapter.id} chapter={chapter} />;
}

function QuizSession({ chapter }: { chapter: Chapter }) {
  const progress = useStudy((state) => state.progress);
  const answer = useStudy((state) => state.answer);
  const retry = useStudy((state) => state.retry);
  const unlock = useStudy((state) => state.unlock);
  const allIndexes = chapter.quiz.map((_, index) => index);
  const [queue, setQueue] = useState(allIndexes);
  const [position, setPosition] = useState(() =>
    Math.max(
      0,
      chapter.quiz.findIndex(
        (_, index) =>
          progress.quizzes[`${chapter.id}-${index}`]?.choice == null,
      ),
    ),
  );
  const [summary, setSummary] = useState(() =>
    chapter.quiz.every(
      (_, index) => progress.quizzes[`${chapter.id}-${index}`]?.choice != null,
    ),
  );
  const [isRetry, setIsRetry] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const questionIndex = queue[position] ?? 0;
  const question = chapter.quiz[questionIndex];
  const response = progress.quizzes[`${chapter.id}-${questionIndex}`];
  const choice = response?.choice;
  const answered = choice != null;
  const correct = answered && choice === question?.correct;
  const latest = chapter.quiz.filter(
    (q, index) =>
      progress.quizzes[`${chapter.id}-${index}`]?.choice === q.correct,
  ).length;
  const first = chapter.quiz.filter(
    (q, index) =>
      progress.quizzes[`${chapter.id}-${index}`]?.first === q.correct,
  ).length;
  const missed = allIndexes.filter(
    (index) =>
      progress.quizzes[`${chapter.id}-${index}`]?.choice !==
      chapter.quiz[index].correct,
  );
  const complete = chapter.quiz.every(
    (_, index) => progress.quizzes[`${chapter.id}-${index}`]?.choice != null,
  );
  const answeredInQueue = queue.filter(
    (index) => progress.quizzes[`${chapter.id}-${index}`]?.choice != null,
  ).length;
  const percent = queue.length
    ? Math.round((answeredInQueue / queue.length) * 100)
    : 100;

  const choose = useCallback(
    (option: number) => {
      if (summary || answered || !question || option >= question.options.length)
        return;
      answer(chapter.id, questionIndex, option);
      const current = useStudy.getState().progress;
      if (
        chapter.quiz.every(
          (q, index) =>
            current.quizzes[`${chapter.id}-${index}`]?.choice === q.correct,
        )
      )
        unlock("quiz-perfect");
    },
    [summary, answered, question, answer, chapter, questionIndex, unlock],
  );

  const next = useCallback(() => {
    if (!answered || summary) return;
    if (position >= queue.length - 1) setSummary(true);
    else setPosition((current) => current + 1);
  }, [answered, summary, position, queue.length]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.repeat
      )
        return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.closest(
            'input, textarea, select, [role="textbox"], [contenteditable="true"], .cm-editor, [role="dialog"]',
          ))
      )
        return;
      if (/^[1-4]$/.test(event.key) && !summary && !answered) {
        const option = Number(event.key) - 1;
        if (option < question.options.length) {
          event.preventDefault();
          choose(option);
        }
      }
      if (event.key === "Enter" && answered && !summary) {
        // Native button activation handles Enter when a button already has focus.
        if (target instanceof HTMLElement) {
          const button = target.closest("button");
          if ((button && !button.disabled) || target.closest("a, summary"))
            return;
        }
        event.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choose, next, summary, answered, question]);

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [questionIndex, summary, isRetry]);

  const start = (indexes: number[], retryOnly: boolean) => {
    indexes.forEach((index) => retry(chapter.id, index));
    setQueue(indexes);
    setPosition(0);
    setIsRetry(retryOnly);
    setSummary(false);
  };

  if (!question)
    return (
      <Panel className="quiz-panel">
        <p>This chapter has no quiz questions.</p>
      </Panel>
    );

  if (summary)
    return (
      <div className="quiz-panel quiz-results">
        <Panel className="quiz-summary">
          <div className="quiz-summary-score">
            <Ring
              value={Math.round((latest / chapter.quiz.length) * 100)}
              size={124}
              label={`Latest score: ${latest} of ${chapter.quiz.length} correct`}
            />
            <span className="quiz-score-caption">LATEST SCORE</span>
          </div>
          <div className="quiz-summary-copy">
            <Badge
              className={latest === chapter.quiz.length ? "success" : "warning"}
            >
              {latest === chapter.quiz.length ? (
                <CheckCircle2 size={13} aria-hidden="true" />
              ) : (
                <RotateCcw size={13} aria-hidden="true" />
              )}
              {latest === chapter.quiz.length
                ? "All answers correct"
                : "Keep building the connection"}
            </Badge>
            <h2 ref={heading} tabIndex={-1}>
              {latest === chapter.quiz.length
                ? "Knowledge, checked."
                : "A useful checkpoint."}
            </h2>
            <p>
              You answered{" "}
              <strong>
                {latest} of {chapter.quiz.length}
              </strong>{" "}
              correctly in your latest responses.
            </p>
            <div className="quiz-score-comparison">
              <div>
                <span>First attempt</span>
                <strong>
                  {first}
                  <small> / {chapter.quiz.length}</small>
                </strong>
              </div>
              <div>
                <span>Latest answers</span>
                <strong>
                  {latest}
                  <small> / {chapter.quiz.length}</small>
                </strong>
              </div>
            </div>
            <p className="quiz-small">
              Your first-attempt score stays fixed when you retry. Quiz answers
              never check off chapter tasks.
            </p>
          </div>
        </Panel>
        <div className="quiz-result-actions">
          {missed.length > 0 && (
            <Button variant="primary" onClick={() => start(missed, true)}>
              <RotateCcw aria-hidden="true" />
              Retry missed questions<Badge>{missed.length}</Badge>
            </Button>
          )}
          <Button onClick={() => start(allIndexes, false)}>
            <RotateCcw aria-hidden="true" />
            Restart all questions
          </Button>
        </div>
        <section
          className="quiz-breakdown"
          aria-label="Question and topic breakdown"
        >
          <div className="quiz-breakdown-heading">
            <h3>Question breakdown</h3>
            <span>{chapter.title}</span>
          </div>
          <p className="quiz-small">
            Compare your original response with your latest understanding.
          </p>
          <ol>
            {chapter.quiz.map((q, index) => {
              const saved = progress.quizzes[`${chapter.id}-${index}`];
              const nowCorrect = saved?.choice === q.correct;
              const firstCorrect = saved?.first === q.correct;
              return (
                <li
                  key={index}
                  className={
                    nowCorrect
                      ? "quiz-breakdown-correct"
                      : "quiz-breakdown-wrong"
                  }
                >
                  <div className="quiz-breakdown-top">
                    <span className="quiz-question-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h4>{q.prompt}</h4>
                    {nowCorrect ? (
                      <CheckCircle2
                        aria-label="Latest answer correct"
                        size={19}
                      />
                    ) : (
                      <XCircle aria-label="Latest answer incorrect" size={19} />
                    )}
                  </div>
                  <div className="quiz-attempt-status">
                    <span>
                      First:{" "}
                      <strong>{firstCorrect ? "Correct" : "Incorrect"}</strong>
                    </span>
                    <span>
                      Latest:{" "}
                      <strong>{nowCorrect ? "Correct" : "Incorrect"}</strong>
                    </span>
                  </div>
                  <details>
                    <summary>Review answer and explanation</summary>
                    <p>
                      <strong>Correct answer:</strong> {q.options[q.correct]}
                    </p>
                    {saved?.choice != null && !nowCorrect && (
                      <p>
                        <strong>Your latest answer:</strong>{" "}
                        {q.options[saved.choice]}
                      </p>
                    )}
                    <p>{q.explanation}</p>
                  </details>
                </li>
              );
            })}
          </ol>
        </section>
        <p className="sr-only" role="status">
          Quiz complete. Latest score {latest} of {chapter.quiz.length}.
          First-attempt score {first} of {chapter.quiz.length}.
        </p>
      </div>
    );

  return (
    <Panel
      className={`quiz-panel quiz-focused ${answered ? (correct ? "quiz-is-correct" : "quiz-is-wrong") : ""}`}
    >
      <div className="quiz-topline">
        <span className="quiz-kicker">
          {isRetry ? "RETRY MISSED" : "KNOWLEDGE CHECK"}
        </span>
        <Badge>
          Question {position + 1} of {queue.length}
        </Badge>
      </div>
      <div
        className="quiz-progress"
        role="progressbar"
        aria-label="Quiz questions answered"
        aria-valuemin={0}
        aria-valuemax={queue.length}
        aria-valuenow={answeredInQueue}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
      <div className="quiz-question">
        <span className="quiz-source">
          {chapter.title} <span aria-hidden="true">/</span> Question{" "}
          {questionIndex + 1}
        </span>
        <h2 ref={heading} tabIndex={-1}>
          {question.prompt}
        </h2>
        <p className="quiz-small" id={`quiz-hint-${chapter.id}`}>
          Choose one answer. Keyboard:{" "}
          {question.options.map((_, index) => index + 1).join(" / ")}.
        </p>
      </div>
      <div
        className="quiz-options"
        role="group"
        aria-label="Answer choices"
        aria-describedby={`quiz-hint-${chapter.id}`}
      >
        {question.options.map((option, optionIndex) => {
          const selected = answered && choice === optionIndex;
          const isCorrect = answered && question.correct === optionIndex;
          return (
            <Button
              key={`${questionIndex}-${optionIndex}`}
              className={`quiz-option ${isCorrect ? "quiz-option-correct" : selected ? "quiz-option-wrong" : answered ? "quiz-option-muted" : ""}`}
              aria-pressed={selected}
              disabled={answered}
              onClick={() => choose(optionIndex)}
            >
              <span className="quiz-option-key" aria-hidden="true">
                {optionIndex + 1}
              </span>
              <span>{option}</span>
              <span className="quiz-option-icon">
                {isCorrect ? (
                  <Check aria-label="Correct answer" />
                ) : selected ? (
                  <X aria-label="Your answer, incorrect" />
                ) : null}
              </span>
            </Button>
          );
        })}
      </div>
      {answered && (
        <div
          key={questionIndex}
          className={`quiz-feedback ${correct ? "quiz-feedback-correct" : "quiz-feedback-wrong"}`}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="quiz-feedback-title">
            {correct ? (
              <CheckCircle2 size={20} aria-hidden="true" />
            ) : (
              <XCircle size={20} aria-hidden="true" />
            )}
            <strong>{correct ? "Correct." : "Not quite."}</strong>
          </div>
          {!correct && (
            <p className="quiz-correct-answer">
              Correct answer: {question.options[question.correct]}
            </p>
          )}
          <p>{question.explanation}</p>
        </div>
      )}
      <div className="quiz-footer">
        <p className="quiz-small">
          {isRetry
            ? "Your first attempt is preserved."
            : response
              ? "Your original answer is saved for comparison."
              : "Think it through. There’s no timer."}
        </p>
        <Button variant="primary" disabled={!answered} onClick={next}>
          {position === queue.length - 1 ? "See results" : "Next question"}
          <ArrowRight aria-hidden="true" />
        </Button>
      </div>
      {answered && (
        <p className="quiz-enter-hint">
          Press <kbd>Enter</kbd> to{" "}
          {position === queue.length - 1 ? "see results" : "continue"}.
        </p>
      )}
      {!complete && (
        <p className="sr-only">
          Answer all questions to see your complete score.
        </p>
      )}
    </Panel>
  );
}
