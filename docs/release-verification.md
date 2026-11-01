# Release verification

The migration preserves all 13 chapters and their original wording/order, 254 tasks, 127 assigned videos, 26 questions, examples, recall prompts, practice statements, source text and references. Parsed curriculum equivalence and browser source-text checks verify this independently.

28 unit/algorithm tests pass. Integrated browser checks cover opt-in saving and reload, notes/counters/reviews, old JSON restore and invalid/cancel flows, downloads, typed reset, first-attempt retention, retry missed, flashcards, full-text search, all task boxes, video expansion, six labs, three screen widths and runtime errors. Separate regressions cover dialog focus, ER keyboard interaction, Ctrl+P, Chapter 9 executable example, and original dashboard filters/summaries.

Offline verification passed with 74 precached local assets, including all lazy labs, SQL Worker/WASM, lessons, quizzes, flashcards, Shiki and KaTeX. No external requests or runtime errors occurred. Core assets and Fontsource fonts are self-hosted.

Mobile Lighthouse reached 99 Performance / 100 Accessibility / 100 Best Practices / 100 SEO with zero layout shift. Screenshots were captured and inspected at 375, 768 and 1440 in both themes for foundation, shell, home, lessons, SQL lab, dashboard and final home. Reports and screenshots are in output/ (ignored generated artifacts).

Independent review identified keyboard event propagation, alternate-key normalization correctness, removed overview features, a seeded-table example conflict, focus restoration and video completion achievement. These were fixed, with normal-form validation, runnable SQL and completion regression tests, plus real browser keyboard/focus checks.

The implementation phases shared independent widget work in parallel. The initial three phases have separate commits; integrated lesson/lab/dashboard work is committed together to keep the repository buildable. User explicitly authorized autonomous decisions and GitHub/Vercel publication.

Known product limits: SQLite dialect; lab datasets are temporary; offline requires an initial complete download; bounded tree/schedule demos. See README for details and reproduction commands.
