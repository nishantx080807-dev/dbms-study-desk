# Study Desk Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans. Independent widget implementation uses dispatching-parallel-agents; the user delegates execution decisions.

**Goal:** Deliver the complete requested redesign and update GitHub/Vercel.

**Architecture:** Immutable extracted curriculum, Zustand opt-in state, lazy React routes and widgets. Static Vite build precached by vite-plugin-pwa.

**Tech Stack:** React, TypeScript, Tailwind v4, shadcn/Radix, Vaul, cmdk, Fuse, Motion, GSAP, Lenis, CodeMirror, sql.js, Shiki, KaTeX, Recharts, Sonner.

**Spec:** docs/superpowers/specs/2026-10-31-study-desk-design.md and supplied request.

## Global constraints
- Preserve all curriculum wording/order, IDs, version-1 backups and storage keys.
- Saving is off by default; theme setting may persist separately. Progress extras obey saving opt-in.
- No core runtime CDN; respect reduced motion; minimum 44px controls on mobile.
- Existing public repository and Vercel domain are the deployment targets.

## Review focus
- Corrupt/imported state never overwrites current progress without validation and confirmation.
- Disabling saving deletes stored progress but retains the live session.
- First quiz attempt never changes on retry; all chapters remain browsable regardless of suggested path state.
- Heavy widgets load and operate offline after PWA installation.
- All lesson navigation, dialogs, search, checkboxes, schedule reordering and diagram controls are keyboard usable.

## Phases
- [x] 1. Extract exact data and establish tokens, fonts, strict configuration and migration tests. Build, screenshot both themes/three widths, commit.
- [x] 2. App shell, responsive sidebar/drawer, command palette, fuzzy search, shortcuts, theme, opt-in store. Test data/state contracts, build/screenshots/commit.
- [x] 3. Home, interactive schema motif, stats, roadmap, route motion. Screenshot critique/build/commit.
- [x] 4. Lessons, source, checklist, note/counter/video tools, TOC, Shiki/KaTeX, existing self-checks. Verify curriculum and controls, screenshots/build/commit.
- [x] 5. SQL plus five matching visual tools. Algorithm/browser tests including errors, screenshots/build/commit.
- [x] 6. Focused quizzes, retry missed, first scores; flashcards/Leitner; dashboard, activity/streak/achievements; validated data panel. Tests/screenshots/build/commit.
- [x] 7. PWA cache and icons/OG, accessibility and performance, final screenshots, independent review. Run full build, browser/offline/axe/Lighthouse; fix to target; push to GitHub and verify Vercel public deployment.

## Interface contracts
- src/data/course.json: exact original data; src/data/types.ts exports Chapter/Task/Quiz.
- src/lib/progress.ts exports initialProgress, validateProgress, chapterStats and useStudy. State retains tasks/notes/reviews/counts/quizzes and optional extras.
- src/components/ui.tsx exports Button, Panel, Badge, Ring, Dialog; semantic CSS tokens in src/styles.css.
- src/widgets/SqlPlayground.tsx default export accepts optional initialQuery; other widgets default export no required props, lazy loaded by chapter IDs.
- Routes hash-based: /, /chapter/:id/:tab, /progress, /data; preserve #chapter-N links.

## Execution ledger
Phase 0 complete: live audit, current repository cloned to isolated study-desk-web. User opted out of questions; no approval gate needed. Existing original workspace preserved.
