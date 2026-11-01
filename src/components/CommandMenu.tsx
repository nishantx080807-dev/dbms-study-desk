import { useMemo, useState } from "react";
import { Command } from "cmdk";
import Fuse from "fuse.js";
import { BookOpen, Search, ArrowUpRight, Moon, Download } from "lucide-react";
import { downloadBackup } from "../lib/progress";
import course from "../data/course.json";
const chapters = course.chapters;
import { Dialog } from "./ui";
interface Props {
  open: boolean;
  setOpen: (v: boolean) => void;
  go: (s: string) => void;
  toggleTheme: () => void;
}
export default function CommandMenu({ open, setOpen, go, toggleTheme }: Props) {
  const [query, setQuery] = useState("");
  const items = useMemo(
    () =>
      chapters.flatMap((c) => [
        {
          key: `c${c.id}`,
          chapter: c.id,
          title: c.title,
          body: c.intro + " " + c.sourceText,
          path: `/chapter/${c.id}/learn`,
          kind: "Chapter",
        },
        ...c.learn.map(([title, body], i) => ({
          key: `t${c.id}-${i}`,
          chapter: c.id,
          title,
          body,
          path: `/chapter/${c.id}/learn?topic=${i}`,
          kind: "Topic",
        })),
        ...c.quiz.map((q, i) => ({
          key: `q${c.id}-${i}`,
          chapter: c.id,
          title: q.prompt,
          body: q.explanation,
          path: `/chapter/${c.id}/quiz`,
          kind: "Quiz",
        })),
        ...c.tasks.map((t) => ({
          key: t.id,
          chapter: c.id,
          title: t.text,
          body: c.title,
          path: `/chapter/${c.id}/checklist`,
          kind: "Action",
        })),
      ]),
    [],
  );
  const fuse = useMemo(
    () =>
      new Fuse(items, {
        keys: [{ name: "title", weight: 3 }, "body"],
        includeMatches: true,
        threshold: 0.36,
        ignoreLocation: true,
        minMatchCharLength: 2,
      }),
    [items],
  );
  const results = query
    ? fuse.search(query, { limit: 14 })
    : items
        .filter((i) => i.kind === "Chapter")
        .map((item) => ({ item, matches: [] }));
  function select(path: string) {
    setOpen(false);
    setQuery("");
    go(path);
  }
  function highlighted(
    text: string,
    indices: readonly (readonly [number, number])[] = [],
  ) {
    let end = 0;
    const parts = [];
    for (const [a, b] of indices) {
      if (a >= text.length) continue;
      parts.push(
        text.slice(end, a),
        <mark key={a}>{text.slice(a, b + 1)}</mark>,
      );
      end = b + 1;
    }
    parts.push(text.slice(end));
    return parts;
  }
  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      title="Find your next idea"
      description="Search the handbook, topics, quizzes and actions."
    >
      <Command shouldFilter={false} label="Search study desk">
        <div className="command-search">
          <Search size={18} />
          <Command.Input
            autoFocus
            value={query}
            onValueChange={setQuery}
            placeholder="Search a concept, chapter or action…"
          />
        </div>
        <Command.List className="command-list">
          <Command.Empty>
            No matches. Try a broader term such as “join” or “normalization”.
          </Command.Empty>
          <Command.Group
            heading={query ? "Search results" : "Jump to a chapter"}
          >
            {results.map(({ item, matches }) => (
              <Command.Item
                key={item.key}
                value={item.key}
                onSelect={() => select(item.path)}
              >
                <BookOpen size={16} />
                <div>
                  <span>
                    {highlighted(
                      item.title,
                      matches?.find((m) => m.key === "title")?.indices,
                    )}
                  </span>
                  <small>
                    Chapter {item.chapter} · {item.kind}
                  </small>
                  {query && item.kind === "Chapter" && (
                    <small className="command-snippet">
                      {highlighted(item.body.slice(Math.max(0,(matches?.find(m=>m.key==='body')?.indices[0]?.[0]??0)-30),Math.max(0,(matches?.find(m=>m.key==='body')?.indices[0]?.[0]??0)-30)+140),matches?.find(m=>m.key==='body')?.indices.map(([a,b])=>[Math.max(0,a-Math.max(0,(matches?.find(m=>m.key==='body')?.indices[0]?.[0]??0)-30)),b-Math.max(0,(matches?.find(m=>m.key==='body')?.indices[0]?.[0]??0)-30)] as const))}…
                    </small>
                  )}
                </div>
                <ArrowUpRight size={14} />
              </Command.Item>
            ))}
          </Command.Group>
          <Command.Group heading="Quick actions">
            <Command.Item
              value="theme"
              onSelect={() => {
                toggleTheme();
                setOpen(false);
              }}
            >
              <Moon size={16} /> Toggle theme <kbd>T</kbd>
            </Command.Item>
            <Command.Item
              value="backup"
              onSelect={() => {
                downloadBackup();
                setOpen(false);
              }}
            >
              <Download size={16} /> Download progress backup
            </Command.Item>
            <Command.Item value="progress" onSelect={() => select("/progress")}>
              Open My progress
            </Command.Item>
            <Command.Item value="data" onSelect={() => select("/data")}>
              Manage progress data
            </Command.Item>
          </Command.Group>
        </Command.List>
        <div className="command-footer">
          <span>
            <kbd>↑</kbd> <kbd>↓</kbd> to navigate
          </span>
          <span>
            <kbd>↵</kbd> open · <kbd>esc</kbd> close
          </span>
        </div>
      </Command>
    </Dialog>
  );
}
