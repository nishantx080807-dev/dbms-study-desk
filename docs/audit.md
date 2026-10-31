# Phase 0 audit

Inspected the public production site and repository on 2026-10-31. Baseline screenshots are in output/playwright/before-{375,768,1440}.png.

Stack: one index.html, inline CSS and vanilla JavaScript. Embedded course-data JSON stores 13 chapters, 254 task IDs, 127 video tasks, 26 quiz questions, learning blocks, worked examples, recall prompts, practice statements, original chapter text, week groups, targets and references. All wording/order will be extracted verbatim into src/data/course.json, with the original HTML retained under migration/ for equivalence checks.

State: version 1 / dbms-mastery-progress with tasks, notes, reviews, counts, quizzes. Quiz records retain first and current answers. Storage keys nishant-dbms-progress-v1 and nishant-dbms-progress-v1-enabled; saving defaults off. Backup import is validated and confirmed; reset is confirmed. Existing four self-check activities, filters, all video groups, notes, counters, source text, references, keyboard navigation and credit must survive.

Visual weaknesses: small dense text, long uniform table, limited hierarchy, no designed dark mode. Usability weaknesses: lesson and quiz discovery is weak; search covers titles/tasks only; mobile navigation is a select; no practical execution or visual models. Runtime browser audit found no JS errors.

Decision: migrate to React + strict TypeScript + Vite + Tailwind v4 with local shadcn/Radix components. Preserve the immutable curriculum. Add a database-workbench visual identity, offline bundled tools and an installable PWA. No network service is required for study progress.
