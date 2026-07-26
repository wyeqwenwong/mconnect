# Handoff: Meta "Connect & Convert" — Kiosk Quiz Game
**Chosen direction: 1c "Soft Studio"** (with 2c 8-choice question arrangement and the 1a-style clean score screen). Admin console = option 1d.

## 1. Overview
Interactive marketing quiz for Meta Connect 2026 (Aug 18, Pavilion Arena, Damansara Heights). Players answer N timed multiple-choice questions (default 5, 30s each) diagnosing marketing problems with Meta "A+ Strategies", earn points, and compete on a live leaderboard synced across multiple portrait touchscreen kiosks. An admin settings console lets the event owner manage the question pool and game rules without code changes. The full product spec is in `gdd_extracted.txt` (bundled).

## 2. About the design files
`Meta Connect Game Screens.dc.html` is a **static HTML design reference**, not production code. Open it in a browser to see all explored options. Recreate the designs in the real stack; do not port the HTML wholesale.

- Section id `t1` = 3 directions × 4 kiosk screens + admin console. **Use only option `1c`** (Entry, Question, Score feedback, Final/Leaderboard) and `1d` (admin console). Ignore 1a/1b — exploration only.
- Section id `t2` = dense 8-choice question arrangements. **Use option `2c`** as the question screen whenever a question has >4 choices or is multi-select; the simpler 1c question layout suits 4 choices.
- All kiosk screens are authored at **1080×1920 portrait** (scaled in the reference via CSS transform). Admin console at 1440×960.

## 3. Target stack (from GDD — confirm before building)
- Game client: React, packaged as Windows .exe via **Electron**, fullscreen kiosk, portrait touchscreen.
- Settings console: React web app (desktop browser), auth-protected.
- Backend: **Vercel serverless API + Supabase** (Postgres, Auth, Realtime) for shared question pool, settings, and live leaderboard across kiosks.
- Kiosks poll/subscribe; settings changes propagate at the start of the next game.

## 4. Design system — "Soft Studio"
### Colors
- Meta brand blue (primary actions, selection, accents): **#0064E0**
- Canvas / app background: **#F0F0F0**
- Card surface: **#FFFFFF**
- Ink (headings/body): **#222222**; secondary text: **#666666**; muted/hints: **#9AA3AF**
- Checkbox border (unchecked): #D8DEE7
- Success green: **#31A24C**; error red: **#E0453A**
- Coral accent (progress gradient end, rank highlight): **#FF6B35**
- Pastel pink accent (decorative circles, badges): **#FFB8D1**
- Dark bar (submit bar, "you" leaderboard row): **#222222**
- Tint fills: blue tint #E6F0FF, coral tint #FFEDE5

### Type
- Family: **Figtree** (Google Fonts), stand-in for Meta's Optimist (not publicly licensed). Weights 400/600/700/800/900.
- Kiosk scale (at 1080×1920): hero numbers 150–200px/900; H1 96–112px/900; question text 46–56px/800 lh 1.3; card labels 30–38px/700; buttons 34–48px/800; meta/hints 26–30px; never below 26px on kiosk.
- Admin scale: page titles 24px/800, body 15px, table headers 13px/700 uppercase.

### Shape & depth
- Big surfaces radius 36–48px; cards/tiles 24–36px; pills/buttons 999px or 24px; checkboxes 14–16px radius squares.
- Shadows minimal: 0 24px 70px rgba(0,0,0,.08) on hero cards only; flat elsewhere.
- Decorative: soft pastel circles (pink #FFB8D1 ~50% opacity, blue ~10%) bleeding off corners; small confetti dots on score screens.
- Spacing: 70–90px screen padding; 22–28px grid gaps; generous whitespace — calm, premium.

### Logo
- Official Meta lockup, top-left on entry screen (~280×94 contain-fit) and in admin header on a white chip. Asset placeholder: replace with approved file from Meta brand resources. **Logo use requires Meta Brand Review approval.**

## 5. Screens (kiosk, 1080×1920 portrait)
### 5.1 Entry / registration (ref: 1c Entry)
- Logo top-left; decorative pink/blue circles off-canvas corners.
- H1 "Connect & Convert" (Convert in blue); one-line subtitle; row of white pill chips with strategy emoji.
- Bottom white card (radius 48): "Enter your name to play" label, gray input (radius 24), full-width blue button "Start the game".
- On-screen keyboard required (kiosk). Name or company, required, max ~30 chars.

### 5.2 Question — standard ≤4 choices (ref: 1c Question)
- Header: "Question N of M" left, player chip right.
- Progress bar: white track, blue→coral gradient fill = time remaining; below it "⏱ Xs left" and points value.
- White question card (radius 48) with pastel icon circle + question text.
- 2×2 grid of white answer cards (radius 36): emoji + label. Selected = solid blue card, white text.
- Footer hint: "Answer within 20s for full points".

### 5.3 Question — dense, up to 8 choices, single/multi (ref: 2c)
- Same header/progress. Question card adds a mode badge: blue tint pill "Select all that apply — K correct" (multi) — omit for single.
- 2×4 grid of compact cards (radius 24) each with a checkbox square: unchecked = 4px #D8DEE7 border; checked = card turns solid blue, white checkbox with blue ✓.
- Multi-select: dark #222 footer bar (radius 28) with "X of K selected" + blue Submit pill. Timer expiry auto-submits current selection.
- Single-select: tap locks in immediately, no submit bar (see 2b behavior).
- Grid adapts: 4 choices → 2×2 large; 5–8 → 2×4 compact. Choices randomized if setting enabled.

### 5.4 Score feedback (ref: updated 1c Feedback — clean centered)
- Light gray canvas, small pastel confetti dots.
- Correct: green circle (340px) with ✓, "+100" in green 120px/900, "Correct — under 20 seconds", one-line strategy explanation, white pill "Total so far · N pts" (points in blue), "Next question in 3…" countdown.
- Wrong: same layout, red #E0453A circle with ✕, "+0", show correct answer + explanation.
- Partial credit (multi): show earned fraction, e.g. "+50 · 1 of 2 correct".
- Auto-advance after 3s. Respect admin toggle "Per-question score display" (off → skip straight to next).

### 5.5 Final score + leaderboard (ref: 1c Leaderboard)
- Blue hero card (radius 48, pink decorative circle): "Your final score", score 170px/900 white, "#R of N players" in pink.
- "Leaderboard" heading; rows = white cards (radius 28) with rank circle (1 blue, 2 pink, 3 coral), name, score. Player's own row = dark #222 card, white text, always visible even outside top ranks.
- Bottom buttons: blue "Share score", white "Play again". Idle timeout → return to entry screen.

### 5.6 Admin settings console (ref: 1d, 1440×960 web)
- Blue header bar: logo chip, title, "● K panels online" green pill, account.
- Left sidebar (240px, white): Question pool (active = blue tint), Game settings, Leaderboard, Panels; danger card at bottom "Reset leaderboard" (coral border, destructive confirm).
- Question pool: table (question text, correct answer(s), points, edit), "+ Add question" blue pill. Editor must support **up to 8 choices per question and a single/multi answer flag** with 1..K correct answers.
- Game settings card: questions per game (numeric), speed bonus toggle, per-question score display toggle, randomize questions & answers toggle, info note "changes propagate at next game", Save button.

## 6. Game logic
- Default: 5 questions per game drawn from pool (random if enabled), 30s each.
- Scoring: base 100/question (per-question override allowed). Speed bonus (if enabled): full points <20s, 75% <30s; +50 speedrun bonus per GDD. Multi-select: proportional credit for correct picks, no negative scores (confirm rule with owner).
- Timer expiry: single → counts as no answer; multi → auto-submit current selection.
- Leaderboard: shared across all kiosks via Supabase Realtime; identified by entered name/company.
- Sound: simple synthesized SFX (Web Audio) — tick under 5s, correct chime, wrong buzz, fanfare on finish. Mutable via admin setting (add to settings if missing).

## 7. Assets & open items
- Meta logo: pending approved asset + Brand Review.
- Question pool content: owner supplies; all text in reference is placeholder.
- Character illustrations: emoji stand-ins for now; real illustrated characters may replace pastel icon circles later.
- Confirm multi-select scoring rule and share-score mechanic (QR? print?) with owner.
