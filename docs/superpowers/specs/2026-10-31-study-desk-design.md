# Study Desk redesign

Authority: the supplied pasted request; it explicitly delegates design choices and says to work autonomously without questions.

Build a technical editorial learning workspace for Nirma B.Tech CSE. The curriculum and task/quiz identifiers are immutable. Vite + React + TypeScript + Tailwind v4 replaces the single HTML. Keep opt-in progress saving, old schema/keys, notes, counters, all activities, backup confirmation and attribution. Add extras under an optional backup extension so old files import.

Layout: collapsible chapter sidebar, contextual topbar, mobile bottom navigation and Vaul chapter drawer. Home places a readable headline beside a cursor-responsive schema graph and a next task; chapter roadmap uses connected rows rather than uniform cards. Lessons have a readable main column and sticky contents. Progress/data have dedicated views.

Palette: dark #0a0d14, raised #11151f, overlay #1a2030; light #faf8f4 with #ffffff panels; indigo #818cf8 and cyan #67e8f9; semantic green/amber/red and category tokens. Space Grotesk display, Geist UI, JetBrains Mono code. 4px spacing, 8/12/16/24px radii, hairlines, soft shadows and restrained grain. Left-aligned editorial hierarchy. Meaningful transform/opacity motion, all reduced-motion paths static.

Widgets: SQLite WASM + CodeMirror SQL lab; ER graph; normalization stepper; B+ tree insert/delete; schedule precedence/deadlock; joins. All operate offline after PWA caching. Exercises are additions, not curriculum rewrites.

Verification: exact source data comparison; old backup import and opt-in persistence; first-attempt retention; algorithm tests; keyboard and dialog flows; both themes at 375/768/1440 after each phase; browser flows and offline reload including lazy widgets; axe; mobile Lighthouse >=95 all categories; production smoke test. Publish to the existing public repo/Vercel project after verification as already authorized.
