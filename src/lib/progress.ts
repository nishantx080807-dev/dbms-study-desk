import { create } from "zustand";
import data from "../data/catalog.json";
import type { Chapter } from "../data/types";
export const chapters: Omit<Chapter, "sourceText">[] = data.chapters;
export const { targets, references } = data;
export const allTasks = chapters.flatMap((c) => c.tasks);
export const KEY = "nishant-dbms-progress-v1";
export const PREF = KEY + "-enabled";
interface Extras {
  activity: Record<string, number>;
  history: { at: string; chapter: number; score: number; total: number }[];
  cards: Record<string, { box: number; due: string }>;
  achievements: string[];
  lastChapter: number;
}
export interface Progress {
  version: 1;
  format: "dbms-mastery-progress";
  tasks: Record<string, boolean>;
  notes: Record<string, string>;
  reviews: Record<string, boolean>;
  counts: Record<string, number>;
  quizzes: Record<string, { first: number; choice: number | null }>;
  extras: Extras;
}
const emptyExtras = (): Extras => ({
  activity: {},
  history: [],
  cards: {},
  achievements: [],
  lastChapter: 1,
});
export const initialProgress = (): Progress => ({
  version: 1,
  format: "dbms-mastery-progress",
  tasks: {},
  notes: {},
  reviews: {},
  counts: {},
  quizzes: {},
  extras: emptyExtras(),
});
const record = (x: unknown): x is Record<string, unknown> =>
  x !== null && typeof x === "object" && !Array.isArray(x);
export function validateProgress(raw: unknown): Progress {
  if (
    !record(raw) ||
    raw.version !== 1 ||
    (raw.format && raw.format !== "dbms-mastery-progress") ||
    !record(raw.tasks)
  )
    throw Error("This is not a supported DBMS progress backup.");
  const next = initialProgress();
  for (const name of ["notes", "reviews", "counts", "quizzes"])
    if (raw[name] !== undefined && !record(raw[name]))
      throw Error("Invalid " + name + " in backup.");
  const source = raw as unknown as Progress;
  for (const task of allTasks) {
    const v = source.tasks[task.id];
    if (v !== undefined) {
      if (typeof v !== "boolean") throw Error("Invalid checkbox value.");
      next.tasks[task.id] = v;
    }
  }
  for (const c of chapters) {
    const note = source.notes?.[c.id],
      review = source.reviews?.[c.id];
    if (note !== undefined) {
      if (typeof note !== "string" || note.length > 20000)
        throw Error("Invalid or oversized chapter note.");
      next.notes[c.id] = note;
    }
    if (review !== undefined) {
      if (typeof review !== "boolean") throw Error("Invalid review flag.");
      next.reviews[c.id] = review;
    }
    c.quiz.forEach((q, i) => {
      const key = c.id + "-" + i,
        v = source.quizzes?.[key];
      if (v === undefined) return;
      const valid = (n: unknown) =>
        Number.isInteger(n) && Number(n) >= 0 && Number(n) < q.options.length;
      if (
        !record(v) ||
        !valid(v.first) ||
        (v.choice !== null && !valid(v.choice))
      )
        throw Error("Invalid quiz answer.");
      next.quizzes[key] = {
        first: v.first as number,
        choice: v.choice as number | null,
      };
    });
  }
  for (const t of targets) {
    const n = source.counts?.[t.id];
    if (n !== undefined) {
      if (!Number.isInteger(n) || n < 0) throw Error("Invalid practice count.");
      next.counts[t.id] = Math.min(n, t.target);
    }
  }
  if (source.extras !== undefined) {
    if (!record(source.extras)) throw Error("Invalid activity data.");
    const e = source.extras;
    if (record(e.activity))
      for (const [date, n] of Object.entries(e.activity))
        if (/^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isInteger(n) && n >= 0)
          next.extras.activity[date] = Math.min(Number(n), 10000);
    if (Array.isArray(e.history))
      next.extras.history = e.history
        .filter(
          (h) =>
            record(h) &&
            typeof h.at === "string" &&
            Number.isFinite(Date.parse(h.at)) &&
            Number.isInteger(h.chapter) &&
            h.chapter >= 1 &&
            h.chapter <= 13 &&
            Number.isInteger(h.score) &&
            h.score >= 0 &&
            h.score <= h.total &&
            h.total === 2,
        )
        .slice(-500);
    if (record(e.cards))
      for (const c of chapters) {
        const v = e.cards[String(c.id)];
        if (
          record(v) &&
          Number.isInteger(v.box) &&
          v.box >= 1 &&
          v.box <= 5 &&
          typeof v.due === "string" &&
          Number.isFinite(Date.parse(v.due))
        )
          next.extras.cards[c.id] = { box: v.box as number, due: v.due };
      }
    if (Array.isArray(e.achievements))
      next.extras.achievements = e.achievements.filter(
        (v): v is string =>
          typeof v === "string" &&
          [
            "first-query",
            "first-step",
            "chapter-complete",
            "normalization",
            "quiz-perfect",
          ].includes(v),
      );
    if (
      Number.isInteger(e.lastChapter) &&
      e.lastChapter >= 1 &&
      e.lastChapter <= 13
    )
      next.extras.lastChapter = e.lastChapter;
  }
  return next;
}
export function chapterStats(p: Progress, id: number) {
  const tasks = chapters.find((c) => c.id === id)?.tasks ?? allTasks;
  const done = tasks.filter((t) => p.tasks[t.id]).length;
  return {
    done,
    total: tasks.length,
    percent: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
  };
}
export function recordAnswer(
  p: Progress,
  id: number,
  index: number,
  choice: number,
) {
  const q = chapters.find((c) => c.id === id)?.quiz[index];
  if (
    !q ||
    !Number.isInteger(choice) ||
    choice < 0 ||
    choice >= q.options.length
  )
    throw Error("Invalid answer");
  const key = id + "-" + index;
  return {
    ...p,
    quizzes: {
      ...p.quizzes,
      [key]: { first: p.quizzes[key]?.first ?? choice, choice },
    },
  };
}
function load() {
  if (typeof localStorage === "undefined")
    return { progress: initialProgress(), saving: false, error: "" };
  try {
    const saving = localStorage.getItem(PREF) === "yes";
    return {
      progress:
        saving && localStorage.getItem(KEY)
          ? validateProgress(JSON.parse(localStorage.getItem(KEY)!))
          : initialProgress(),
      saving,
      error: "",
    };
  } catch {
    return {
      progress: initialProgress(),
      saving: false,
      error:
        "Saved progress could not be loaded. Restore a backup in the Data panel.",
    };
  }
}
function today() {
  return new Date().toLocaleDateString("en-CA");
}
interface StudyStore {
  progress: Progress;
  saving: boolean;
  error: string;
  setSaving: (on: boolean) => void;
  toggleTask: (id: string) => void;
  note: (id: number, text: string) => void;
  review: (id: number) => void;
  count: (id: string, n: number) => void;
  answer: (id: number, index: number, choice: number) => void;
  retry: (id: number, index: number) => void;
  remember: (id: number) => void;
  replace: (p: Progress) => void;
  reset: () => void;
  unlock: (id: string) => void;
  card: (id: number, known: boolean) => void;
  clearError: () => void;
}
const loaded = load();
export const useStudy = create<StudyStore>((set, get) => {
  const save = (progress: Progress) => {
    let error = "";
    if (get().saving) {
      try {
        localStorage.setItem(KEY, JSON.stringify(progress));
      } catch {
        error = "Browser saving failed. Download a backup now.";
        set({ saving: false });
      }
    }
    set({ progress, error });
  };
  const active = (p: Progress): Progress => ({
    ...p,
    extras: {
      ...p.extras,
      activity: {
        ...p.extras.activity,
        [today()]: (p.extras.activity[today()] ?? 0) + 1,
      },
    },
  });
  return {
    ...loaded,
    clearError: () => set({ error: "" }),
    setSaving: (saving) => {
      try {
        if (saving) {
          localStorage.setItem(KEY, JSON.stringify(get().progress));
          localStorage.setItem(PREF, "yes");
        } else {
          localStorage.removeItem(KEY);
          localStorage.removeItem(PREF);
        }
        set({ saving, error: "" });
      } catch {
        set({
          saving: false,
          error: "Browser storage is unavailable. Use downloadable backups.",
        });
      }
    },
    toggleTask: (id) => {
      if (!allTasks.some((t) => t.id === id)) return;
      const p = get().progress;
      const progress = active({
        ...p,
        tasks: { ...p.tasks, [id]: !p.tasks[id] },
      });
      if (
        progress.tasks[id] &&
        !progress.extras.achievements.includes("first-step")
      )
        progress.extras.achievements = [
          ...progress.extras.achievements,
          "first-step",
        ];
      const owner = chapters.find((c) => c.tasks.some((t) => t.id === id));
      if (
        owner &&
        chapterStats(progress, owner.id).percent === 100 &&
        !progress.extras.achievements.includes("chapter-complete")
      )
        progress.extras.achievements = [
          ...progress.extras.achievements,
          "chapter-complete",
        ];
      save(progress);
    },
    note: (id, text) =>
      save({
        ...get().progress,
        notes: { ...get().progress.notes, [id]: text.slice(0, 20000) },
      }),
    review: (id) =>
      save({
        ...get().progress,
        reviews: {
          ...get().progress.reviews,
          [id]: !get().progress.reviews[id],
        },
      }),
    count: (id, n) => {
      const target = targets.find((t) => t.id === id);
      if (target && Number.isInteger(n))
        save(
          active({
            ...get().progress,
            counts: {
              ...get().progress.counts,
              [id]: Math.max(0, Math.min(target.target, n)),
            },
          }),
        );
    },
    answer: (id, index, choice) => {
      let p = active(recordAnswer(get().progress, id, index, choice));
      const c = chapters.find((c) => c.id === id)!;
      if (c.quiz.every((_, i) => p.quizzes[id + "-" + i]?.choice != null)) {
        const score = c.quiz.filter(
          (q, i) => p.quizzes[id + "-" + i].choice === q.correct,
        ).length;
        p = {
          ...p,
          extras: {
            ...p.extras,
            history: [
              ...p.extras.history,
              {
                at: new Date().toISOString(),
                chapter: id,
                score,
                total: c.quiz.length,
              },
            ].slice(-500),
          },
        };
      }
      save(p);
    },
    retry: (id, index) => {
      const p = get().progress,
        key = id + "-" + index;
      if (p.quizzes[key])
        save({
          ...p,
          quizzes: { ...p.quizzes, [key]: { ...p.quizzes[key], choice: null } },
        });
    },
    remember: (id) => {
      const p = get().progress;
      if (p.extras.lastChapter !== id)
        save({ ...p, extras: { ...p.extras, lastChapter: id } });
    },
    replace: (p) => save(validateProgress(p)),
    reset: () => save(initialProgress()),
    unlock: (id) => {
      const p = get().progress;
      if (!p.extras.achievements.includes(id))
        save(
          active({
            ...p,
            extras: {
              ...p.extras,
              achievements: [...p.extras.achievements, id],
            },
          }),
        );
    },
    card: (id, known) => {
      const p = get().progress,
        box = known ? Math.min((p.extras.cards[id]?.box ?? 1) + 1, 5) : 1;
      const due = new Date();
      due.setDate(due.getDate() + [0, 1, 2, 4, 8, 16][box]);
      save(
        active({
          ...p,
          extras: {
            ...p.extras,
            cards: { ...p.extras.cards, [id]: { box, due: due.toISOString() } },
          },
        }),
      );
    },
  };
});
export function downloadBackup() {
  const blob = new Blob(
    [JSON.stringify(useStudy.getState().progress, null, 2)],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = "dbms-progress-" + today() + ".json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
