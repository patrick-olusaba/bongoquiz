# BongoQuiz — Player Retention Overhaul (+ Refined Neon theme)

**Date:** 2026-07-03
**Status:** Design — **deferred** (next slice, after the look-and-feel refresh)
**Scope:** The **player retention** overhaul. The Refined Neon look-and-feel refresh was split into its own spec that ships first — see `2026-07-03-look-and-feel-refresh-design.md`. This spec's retention surfaces (streak card, comeback screen, push prompt) **consume the design tokens** established there rather than defining their own; §4.5 below is retained only as the styling brief for those surfaces.

---

## 1. Context & roadmap

"Make the whole website better — front, back, admin, support" is four separate initiatives. We deliberately decomposed it and sequenced player-facing growth first. Within growth, the chosen focus is **retention (getting players to come back)**, overhauled deeply rather than touching all funnel stages shallowly.

**Deferred to later specs (not in scope here):**
- Acquisition overhaul (referral loop, OG/Twitter share cards, SEO/landing).
- Activation overhaul (first-run onboarding, load speed, `HomeScreen.tsx` refactor — currently 1,280 lines).
- Revenue/economy, back-end reliability & Firestore cost, admin (19 screens) and support ops.
- Funnel analytics instrumentation. **Note:** the app currently has *no* behavioral/event analytics — only aggregate counts in the admin dashboard. We are proceeding on this retention slice without it by choice; a later spec should add event instrumentation so future decisions are evidence-based.

## 2. Problem statement

Retention is not a blank slate — real mechanics exist — but three specific things in the code actively suppress return visits:

1. **`checkInactivity()` punishes the exact behavior we want.** `src/component/game/HomeScreen.tsx:549` — after 24h of inactivity it *wipes* the player's local identity (name, phone, best score, streak, achievements) and resets them to "Player". A player returning after a day is silently logged out and stripped of visible progress.
2. **No re-engagement channel.** `messagingSenderId` is configured in `src/firebase.ts` but there is **zero** FCM/push implementation and **no scheduled Cloud Functions**. Every visit must be self-initiated; nothing pulls a lapsed player back.
3. **The day-streak mechanic is dead / hidden.** A server-side daily streak already exists (`claimDailyBonus`/`getDailyBonusStatus`, `dailyBonusStreak`/`lastDailyBonusDate`), *and* a separate client util `src/utils/streakDays.ts` (consecutive days played) is fully written but commented out (`HomeScreen.tsx:539`) and localStorage-only. Two half-streaks, neither surfaced as a retention hero, one of them dead code.

Additionally, the current UI is a maximalist neon-arcade palette (gold + magenta + cyan + violet + green firing at once), which makes it hard for a new streak surface to stand out.

## 3. Goals & non-goals

**Goals**
- A returning player never loses identity or progress.
- One clear, prominent **daily streak** with strict loss-aversion (miss a day → reset).
- A working **web push** re-engagement channel with scheduled, targeted nudges.
- A **comeback surface** that greets returning players.
- A restrained **Refined Neon** theme (gold + cyan on deep navy; retire magenta/purple) applied across the **player shell and core game** — not just the retention surfaces.

**Non-goals**
- No streak-freeze / forgiveness token (explicit decision: strict streak).
- No changes to core gameplay *logic*, economy balance, or the mini-games' internals.
- No re-theme of the 8 mini-games (Bible, Biology, Math, General Knowledge, Sudoku, StreetBongo, ConnectDots, SumTen) in this spec — their bespoke internal styling is a follow-up. This spec re-themes the shared shell + core Bongo quiz only.

## 4. Design

### 4.1 Fix the leak — durable identity (lands first)

Rewrite `checkInactivity()` so it **never destroys identity**. Local state (`bongo_player_name`, `bongo_player_phone`, streak, scores) becomes a **cache**, not a self-destructing store.

- Remove the 24h `localStorage.removeItem(...)` wipe entirely.
- On load, if a phone is present, **rehydrate** name / streak / totals from the player's Firestore doc (source of truth) rather than trusting or clearing local values.
- Keep a "last activity" timestamp only for analytics/return-detection, never for deletion.
- **Acceptance:** open the app, set identity, wait past 24h (or fake the timestamp), reload → still logged in, streak and scores intact.

### 4.2 Unify into one daily streak

There will be **one** streak, backed by the existing server fields (`dailyBonusStreak` / `lastDailyBonusDate` and the `getDailyBonusStatus`/`claimDailyBonus` callables). We surface it, not rebuild it.

- **Advancement rule:** the daily streak advances once per day. Playing the first game of the day auto-triggers the daily check-in claim if not already claimed, so "play today" and "keep your streak" are the same action (no separate button to hunt for). The existing escalating BongoCoin reward (`DAILY_BONUS_POINTS`, `[10,15,20,25,30,40,50]`, capped at 30 days server-side) remains the payout.
- **Strict reset:** if `lastClaimDate !== yesterday`, streak resets to 1 (already the server behavior — keep it).
- **Retire the dead code:** delete `src/utils/streakDays.ts` and the commented `getStreakInfo()` usage; there is exactly one streak, and it is server-owned.
- **Surface (Refined Neon):** a prominent home card showing `🔥 Day N streak`, a 7-dot week strip (past days lit, today highlighted, future dim), and a loss-aversion line: *"Play today to keep your N-day streak."* When today is already done: *"Streak safe — see you tomorrow."*
- **Acceptance:** play on consecutive days → counter increments and dots light; skip a day → counter resets to 1 on next play; claim reward fires exactly once per day.

### 4.3 Web push re-engagement (largest build — in scope)

Implement Firebase Cloud Messaging web push end to end.

**Client**
- Service worker for background messages (`firebase-messaging-sw.js` in `public/`), integrated with the existing PWA/service-worker setup (verify no conflict with `vite-plugin-pwa`).
- **Opt-in prompt timed for consent, not friction:** request notification permission **after a positive moment** (e.g., finishing a game or claiming a streak day), never on first load. Refined-Neon styled prompt explaining the value ("Get reminded before your streak breaks").
- On grant, obtain the FCM token and store it on the player's Firestore doc (e.g., `fcmTokens` array keyed by device; prune invalid tokens on send failure).

**Back-end (scheduled Cloud Functions)**
- Add scheduled function(s) (Cloud Scheduler / `functions.pubsub.schedule`) — the first scheduled functions in the codebase.
- **Nudge types (targeted, quiet-hours aware):**
  - *Streak-at-risk:* player has an active streak, hasn't played today, evening local time → "Your N-day streak breaks tonight — play now."
  - *Daily bonus ready:* new day, bonus unclaimed → "Your daily bonus is waiting."
  - *Tournament soon:* a tournament the player fits is about to start (reuse existing tournament data).
- Frequency cap: at most one re-engagement push per player per day; never push to players who played in the last few hours; respect a per-player opt-out.
- Handle token cleanup on `messaging/registration-token-not-registered`.

**Acceptance:** grant permission on device → token appears in Firestore; a scheduled run (or manual trigger in emulator) sends a streak-at-risk push that deep-links into the app.

### 4.4 Comeback surface

When a returning player opens the app (detected via last-activity gap + server streak state), greet them instead of dropping them cold:

- A lightweight, dismissible welcome-back card/modal (Refined Neon): *"Welcome back — you're on a Day N streak. Play now to keep it."* with a single primary CTA into a game.
- If the streak already lapsed while away: *"Your streak reset — start a new one today,"* framed as a fresh start, not a punishment.
- Closes the loop from the push notification (push → open → comeback surface → play → streak advances).

### 4.5 Refined Neon look-and-feel refresh (player shell + core game)

A real visual refresh — not just recoloring the new retention surfaces. Introduce shared design tokens and roll them through the main player-facing shell and the core Bongo quiz.

- **Palette:** deep navy background (`#0b0f24`–`#141a33`), **gold** primary (`#ffd200`), **cyan** secondary (`#22d3ee`/`#7dd3fc`), muted slate for structure (`#26304f`, `#5566aa`). **Retire** magenta/violet/green as hero colors. Reference mockup: Direction **A · Refined Neon** (saved under `.superpowers/brainstorm/`).
- **Tokens (single source of truth):** define CSS custom properties (e.g., `--bq-bg`, `--bq-surface`, `--bq-primary`, `--bq-secondary`, `--bq-border`, `--bq-muted`, plus radius/shadow/spacing tokens) in a shared stylesheet (extend `src/styles/theme.css`). Every re-themed surface consumes tokens — no more hard-coded hexes on these screens — so the remaining mini-games and later slices can adopt the same system.
- **In scope (player shell + core game):**
  - App shell: loading screen, `PWAInstallBanner`, bottom nav (`BottomNav`), desktop sidebar (`DesktopSidebar`), top bars (`QuizTopBar`, `PointsBar`).
  - Home: `HomeScreen` surfaces (hero/play CTA, browse games, plus the new streak/comeback cards from §4.2/§4.4).
  - Core Bongo quiz rounds: `Round1Screen`, `Round2*`, `Round3SpinScreen`, transitions, `FinalResultScreen`, `SessionSummary`.
  - Progress/economy surfaces: `Leaderboardscreen` (with current-player row highlight), `ProfilePage`, `BongoWalletPage`, `GameHistory`.
  - Shared components: primary/secondary buttons, cards, modals (daily bonus, deduction, how-to-play, player-name), chips/badges.
- **Consistency pass:** unify button/card/modal styling to the token set and a consistent radius/shadow/spacing scale so the shell reads as one product rather than many independently-styled screens.
- **Out of scope (this spec):** the 8 mini-games' internal screens, admin, and support — they keep current styling (follow-up specs can adopt the same tokens).
- **Non-regression:** re-theming is visual only; no layout logic, routing, or gameplay behavior changes. Verify each re-themed screen still functions and is responsive (mobile-first, given the PWA/WhatsApp audience).

## 5. Data & interfaces (summary)

- **Firestore player doc:** reuse `dailyBonusStreak`, `lastDailyBonusDate`; add `fcmTokens` (array) and `pushOptOut` (bool) and a last-activity timestamp for return detection.
- **Callables (existing, reused):** `getDailyBonusStatus`, `claimDailyBonus`. Auto-claim-on-first-play wires the existing claim path.
- **New Cloud Functions:** scheduled nudge dispatcher(s) + token-cleanup on send failure.
- **New client files:** `public/firebase-messaging-sw.js`; a push-permission hook/util; streak + comeback UI components; shared theme tokens in `src/styles/theme.css`.

## 6. Risks & mitigations

- **Service worker conflict** with `vite-plugin-pwa` → verify registration order; test PWA install + push together.
- **iOS web push** limitations → web push on iOS requires an installed PWA (iOS 16.4+); treat push as progressive enhancement, streak/comeback work without it.
- **Notification fatigue** → strict per-day frequency cap, quiet hours, easy opt-out, suppress if recently active.
- **Auto-claim edge cases** (double claim, timezone/day-boundary) → server remains the single source of truth; day key computed server-side; claim is idempotent per `todayKey` (existing behavior).
- **Strict streak frustration** (chosen deliberately) → mitigate with clear same-day warnings via the surface + push, so resets rarely surprise players.

## 7. Build sequence

1. **Identity fix** (§4.1) — stop the bleeding; smallest, highest-safety, no new infra.
2. **Refined Neon tokens** (§4.5) — define the shared token set + base components first, so everything after consumes tokens.
3. **Streak unification + surface** (§4.2) — surface existing server state, built token-native.
4. **Shell + core-game re-theme** (§4.5) — roll tokens through app shell, home, rounds, leaderboard, profile, wallet, shared components; consistency pass.
5. **Comeback surface** (§4.4) — depends on 1–3.
6. **Web push** (§4.3) — largest; client SW + opt-in, then Firestore tokens, then scheduled functions, then cleanup.

## 8. Success criteria

- Returning players retain identity/progress 100% of the time (regression test on the old wipe path).
- One streak, visibly surfaced, advancing/resetting correctly across day boundaries.
- Push opt-in obtainable and tokens stored; at least one scheduled nudge type delivering on device with a working deep link.
- Refined Neon tokens applied consistently across the player shell + core game (§4.5 in-scope list), with no hard-coded hexes remaining on those screens and no functional/responsive regressions.
