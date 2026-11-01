import { useState } from "react";
import { FlaskConical, CheckCircle2 } from "lucide-react";
import { Button, Panel } from "./ui";
export default function SelfCheck({ id }: { id: number }) {
  const [answer, setAnswer] = useState(""),
    [feedback, setFeedback] = useState(""),
    [correct, setCorrect] = useState(false);
  if (![1, 2, 5, 8].includes(id)) return null;
  const questions: Record<
    number,
    {
      title: string;
      prompt: string;
      choices?: [string, string][];
      correct: string;
      explanation: string;
    }
  > = {
    1: {
      title: "Identify the schema level",
      prompt:
        "An index on Enrollment.student_id is created. Which level changed?",
      choices: [
        ["external", "External"],
        ["conceptual", "Conceptual"],
        ["internal", "Internal"],
      ],
      correct: "internal",
      explanation:
        "The internal level changes: an index is a storage/access structure. The conceptual tables and external views can stay unchanged.",
    },
    2: {
      title: "Identify the enrollment key",
      prompt:
        "Assume a student may enroll once per course. Select the minimal identifier of an enrollment.",
      choices: [
        ["student", "student_id"],
        ["pair", "(student_id, course_id)"],
        ["name", "name"],
      ],
      correct: "pair",
      explanation:
        "The pair identifies one enrollment. A student can take multiple courses, so student_id alone is not enough.",
    },
    5: {
      title: "Compute an attribute closure",
      prompt:
        "R(A,B,C,D), F = {A → B, B → C, A → D}. Enter A+ using attribute letters.",
      correct: "ABCD",
      explanation:
        "A gives B and D; B gives C. A+ = {A,B,C,D}, so A is a key for this relation.",
    },
    8: {
      title: "Inspect a schedule",
      prompt: "r1(X), w2(X), w1(X)\nIs the schedule conflict-serializable?",
      choices: [
        ["yes", "Yes"],
        ["no", "No"],
      ],
      correct: "no",
      explanation:
        "r1(X) before w2(X) creates T1 → T2; w2(X) before w1(X) creates T2 → T1. The cycle makes it not conflict-serializable.",
    },
  };
  const q = questions[id];
  function check(value: string) {
    const normalized =
      id === 5
        ? [...new Set(value.toUpperCase().replace(/[^A-Z]/g, ""))]
            .sort()
            .join("")
        : value;
    const yes = normalized === q.correct;
    setCorrect(yes);
    setFeedback(`${yes ? "Correct." : "Not quite."} ${q.explanation}`);
  }
  return (
    <Panel className="self-check">
      <div className="row">
        <FlaskConical size={18} color="var(--cyan)" />
        <h3>{q.title}</h3>
      </div>
      <p className="self-prompt">{q.prompt}</p>
      {q.choices ? (
        <div className="row wrap">
          {q.choices.map(([value, label]) => (
            <Button key={value} onClick={() => check(value)}>
              {label}
            </Button>
          ))}
        </div>
      ) : (
        <form
          className="row wrap"
          onSubmit={(e) => {
            e.preventDefault();
            check(answer);
          }}
        >
          <label className="sr-only" htmlFor="closure">
            Attribute closure of A
          </label>
          <input
            id="closure"
            className="field"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="e.g. A, B"
            maxLength={30}
          />
          <Button type="submit">Check closure</Button>
        </form>
      )}
      {feedback && (
        <p
          className={`self-feedback ${correct ? "correct" : ""}`}
          role="status"
        >
          {correct && <CheckCircle2 size={16} />} {feedback}
        </p>
      )}
    </Panel>
  );
}
