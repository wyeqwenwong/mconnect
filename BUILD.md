# Meta Connect & Convert — Build & Run

Implementation of the kiosk quiz game + admin settings console. Final design
direction: **3a "Confetti Pop"** (per [`design_handoff/README.md`](design_handoff/README.md)),
built with the official PNG asset kit; **1d** admin console. The original spec is
in [`gdd_extracted.txt`](gdd_extracted.txt).

## Two game modes (admin picks one)

The event owner chooses the **Game mode** in the settings console:

- **Quiz** — timed multiple-choice; choices render as tappable speech bubbles.
- **Mix & Match** — draw a line from each answer bubble to the A+ icon it belongs
  to. A type/icon can have **multiple** matching answers, and admins can add
  **irrelevant decoy answers** that match nowhere (should be left unlinked).
  Both columns are shuffled each game; score is awarded per correct match.
  A Mix & Match game **always plays exactly one question** — only a single match
  question may be active at a time (activating one deactivates the others), and
  "questions per game" is fixed at 1 in this mode.

Questions of both kinds live in one pool; the active mode decides which are drawn.

## Stack

- **Vite + React + TypeScript** — one repo, two entry points:
  - `index.html` → **kiosk game client** (portrait 1080×1920, scaled to fit).
  - `admin.html` → **settings console** (desktop, 1440×960).
- **Data layer** (`src/lib/store.ts`) with two interchangeable backends:
  - **Local (default)** — `localStorage` + `BroadcastChannel`. Open the game in
    several tabs to simulate multiple kiosks sharing one live leaderboard.
  - **Remote** — set `VITE_API_BASE` and every call goes to the Vercel + Supabase
    API in [`api/`](api) / [`supabase/schema.sql`](supabase/schema.sql).
- **Electron** (`electron/main.cjs`) packages the client as a fullscreen Windows
  kiosk `.exe` via `electron-builder`.
- **Sound** — synthesized Web Audio SFX (`src/lib/sound.ts`), no audio assets.

## Run it

```bash
npm install
npm run dev
```

- Game client:  http://localhost:5173/
- Admin console: http://localhost:5173/admin.html  (demo passcode: `connect2026`)

Open the game in **two tabs** to watch the leaderboard sync live across "kiosks".

Other scripts:

```bash
npm run build         # production build (dist/) — both entry points
npm run typecheck     # tsc, no emit
npm run electron:dev  # run the client inside an Electron kiosk window
npm run electron:build# package a Windows .exe (electron-builder)
```

## What's implemented (spec → code)

| Spec | Where |
| --- | --- |
| Entry + on-screen keyboard, real assets (3a) | `src/game/screens/EntryScreen.tsx` |
| Quiz question — tappable bubbles, single/multi | `src/game/screens/QuestionScreen.tsx` |
| **Match question — draw/tap-to-connect lines, decoys, shuffled columns** | `src/game/screens/MatchScreen.tsx` |
| Score feedback (quiz + match), TOTAL pill, NEXT (3a) | `src/game/screens/FeedbackScreen.tsx` |
| TOP 5 sunburst podium leaderboard, live (3a) | `src/game/screens/LeaderboardScreen.tsx` |
| 30s timer, low-time ticks, auto-submit on expiry | `QuestionScreen.tsx`, `MatchScreen.tsx` |
| Scoring: quiz + match (per-match credit), speed tiers, speedrun +50 | `src/lib/scoring.ts` |
| Draw N of the active MODE, shuffle answers / icon+answer columns | `store.ts › drawGame()` |
| A+ icon set + line colors; `asset()` path helper | `src/lib/assets.ts` (files in `public/assets/`) |
| Admin: pool (both kinds), quiz editor + **match editor** (icons, multiple answers/type, irrelevant-decoy checkbox) | `src/admin/QuestionPool.tsx`, `QuestionEditor.tsx` |
| Admin: game **mode** selector + settings, propagate-on-next-game | `src/admin/GameSettingsPanel.tsx` |
| Admin: leaderboard view, reset, panels online | `LeaderboardView.tsx`, `PanelsView.tsx` |

## Production backend (Supabase + Vercel)

1. Create a Supabase project; run [`supabase/schema.sql`](supabase/schema.sql).
   Enable Realtime on the `scores` table for live leaderboard push.
2. `npm i @supabase/supabase-js` and deploy to Vercel. Set env vars
   `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   (see [`.env.example`](.env.example)).
3. Build the client/console with `VITE_API_BASE=https://<your-app>.vercel.app`.
   The same `.exe` build can point at dev or prod via this config value.

Admin write routes (`/api/admin/*`) currently trust the caller — put them behind
Supabase Auth / Vercel middleware before a real event (the console's passcode
gate is a demo placeholder, not a security boundary).

## Open items (carried from handoff §7)

- **Meta logo** — placeholder lockup in `src/game/components/MetaLogo.tsx`;
  replace with the approved asset (requires Meta Brand Review).
- **Question content** — seed pool in `src/lib/seed.ts` is placeholder; the event
  owner supplies the real pool via the console.
- **Share mechanic** — "Share score" uses Web Share / clipboard; confirm the
  final QR/print approach with the owner.
- **Multi-select scoring** — implemented as proportional credit, wrong picks
  cancel correct picks, never negative. Confirm this rule with the owner.
