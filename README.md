# DBMS Study Desk

A React learning workspace and progress checklist created by Nishant for Nirma B.Tech CSE. The original 13 chapters, wording, 254 actions, 127 lecture tasks and 26 quiz questions are preserved.

## Live site

**[Open DBMS Study Desk](https://dbms-study-desk.vercel.app/)**

## Features

- 13 handbook chapters and 254 checklist actions
- Persistent progress, notes, review flags, and practice counters
- Quizzes, active-recall prompts, and DBMS learning activities
- JSON backup and restore
- Responsive, keyboard-accessible interface

## Run locally

Requires Node.js 22.12+.

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

The production build is in `dist/`. Push `main` to update the connected Vercel project; `vercel.json` declares the Vite build and output directory. No environment variables or backend are required.

## What changed

Dark and warm light themes, command palette and fuzzy handbook search, a connected chapter roadmap, readable lessons, focused quizzes, flashcards with Leitner review, activity and quiz trends, six working visual labs, and an installable offline PWA.

React + TypeScript + Vite provide the app structure; Tailwind v4 and local shadcn-style Radix primitives provide tokens/dialogs; Zustand retains opt-in progress. Vaul, cmdk, Fuse, Motion, GSAP, Lenis, Sonner and Lucide support navigation and interaction. CodeMirror + SQLite WASM run SQL in a worker with a timeout; React Flow, SVG and Motion power visual labs. Shiki/KaTeX render examples/formulas, Recharts shows actual quiz history. Fontsource fonts and all core libraries are bundled locally.

## Compatibility and limits

Saving defaults to off. The original `nishant-dbms-progress-v1` storage key, opt-in preference and version-1 JSON backups are compatible; new activity/cards data lives in an optional extension. Reset and restore require confirmation. No study progress is sent to a server.

Offline use requires one complete online visit so the service worker can download the app. SQL uses SQLite, not Oracle or MongoDB; the original dialect examples remain intact. SQL datasets reset when leaving the lab; a five-second query timeout also restores sample data. The B+ tree demo allows 32 integer keys, the schedule builder 24 operations, and the deadlock demo uses exclusive locks over X/Y.

## Verification

`npm test` checks curriculum equivalence, backup compatibility, first attempts, SQL and widget algorithms. With the preview running on port 4173, run `node scripts/verify-browser.cjs`, `node scripts/regressions.cjs`, `node scripts/offline.cjs`, `node scripts/axe.cjs`, and `node scripts/lighthouse.mjs`. Install Chromium using `npx playwright install chromium`, or set `CHROME_PATH` to an existing browser. Screenshots and reports are written under `output/`.

Created by [Nishant](https://github.com/nishantx080807-dev).
