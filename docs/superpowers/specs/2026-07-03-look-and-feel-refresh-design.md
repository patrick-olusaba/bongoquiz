# BongoQuiz — Look-and-Feel Refresh (Refined Neon)

**Date:** 2026-07-03
**Status:** Design — approved for planning
**Scope:** Slice 1 of a larger "make the website better" effort, sequenced **first**. A visual refresh of the **player shell + core Bongo quiz**, built on a shared CSS design-token system (Refined Neon). Player retention is the **next** slice — see `2026-07-03-retention-overhaul-design.md` (deferred), whose surfaces will consume the tokens established here.

---

## 1. Context & roadmap

"Make the whole website better — front, back, admin, support" was decomposed into slices. This spec is the **look-and-feel refresh**, chosen to ship before the retention overhaul so that retention surfaces (streak card, comeback screen, push prompt) are built on top of an already-established design system rather than inventing one.

**Deferred to later specs (not in scope here):**
- Retention overhaul (identity fix, unified streak, comeback surface, web push) — designed, next in line.
- Re-theme of the 8 mini-games' internal screens; admin; support.
- Acquisition, activation, revenue/economy, back-end reliability, analytics instrumentation.

## 2. Problem statement

The current UI is a **maximalist neon-arcade** palette — gold (`#ffd200`), magenta (`#ff00d4`/`#ff28f4`), cyan (`#22d3ee`), violet (`#7c3aed`/`#7b61ff`), and green (`#38ef7d`) all competing as hero colors on deep navy. Concretely:

- **No shared token system.** Colors are hard-coded hexes scattered across many CSS files and inline styles (e.g., `#ffd200` appears 33×, `#ff6b6b` 27×, `#22d3ee` 27×, plus dozens more variants). There is a `src/styles/theme.css` but it is not a single source of truth.
- **Inconsistent components.** Buttons, cards, and modals are styled independently per screen, so the shell reads as many separate mini-apps rather than one product.
- **Too many hero colors** makes visual hierarchy weak and the product feel busy/dated.

## 3. Goals & non-goals

**Goals**
- A **single source of truth** for visual style: CSS design tokens (color, radius, shadow, spacing) in `src/styles/theme.css`.
- Apply the restrained **Refined Neon** palette (gold + cyan on deep navy; magenta/violet/green retired as hero colors) across the player shell and core game.
- **Consistent** buttons, cards, modals, chips/badges via the token set and a shared scale.
- **Zero functional or responsive regressions** — visual-only change, mobile-first.

**Non-goals**
- No layout logic, routing, or gameplay behavior changes.
- No re-theme of the 8 mini-games (Bible, Biology, Math, General Knowledge, Sudoku, StreetBongo, ConnectDots, SumTen), admin, or support in this spec — follow-ups can adopt the same tokens.
- No new retention mechanics (separate, next spec).

## 4. Design

### 4.1 Design tokens (build first)

Define CSS custom properties in `src/styles/theme.css` as the single source of truth. Indicative set:

- **Color:** `--bq-bg` (deep navy `#0b0f24`), `--bq-bg-2` (`#141a33`), `--bq-surface` (`#0f1630`), `--bq-border` (`#26304f`), `--bq-primary` (gold `#ffd200`), `--bq-primary-ink` (`#0b0f24`), `--bq-secondary` (cyan `#22d3ee`), `--bq-secondary-soft` (`#7dd3fc`), `--bq-text` (`#eef2ff`), `--bq-muted` (`#5566aa`), plus semantic states (`--bq-success`, `--bq-danger`, `--bq-warning`).
- **Radius:** `--bq-r-sm`, `--bq-r-md`, `--bq-r-lg`.
- **Shadow:** `--bq-shadow-1`, `--bq-shadow-2`.
- **Spacing scale:** `--bq-space-1..6` (consistent gaps/padding).
- Reference mockup: Direction **A · Refined Neon** (saved under `.superpowers/brainstorm/`).

### 4.2 Base components

Establish shared, token-native styles (utility classes or lightweight components) for the primitives every screen reuses, so re-theming a screen is mostly swapping to these:

- **Buttons:** primary (gold), secondary (cyan/outline), ghost, danger — one radius/shadow/height scale.
- **Cards / surfaces:** consistent background, border, radius, shadow.
- **Modals:** shared overlay + panel styling (reuse `src/assets/modalOverlaybtn.css` as the base to consolidate).
- **Chips / badges / pills**, list rows, and the current-player highlight treatment.

### 4.3 Surface rollout (player shell + core game)

Re-theme these to consume tokens/base components. No hard-coded hexes should remain on these screens.

- **App shell:** loading screen (`App.tsx` / `App.css`), `PWAInstallBanner`, `BottomNav`, `DesktopSidebar`, `QuizTopBar`, `PointsBar`.
- **Home:** `HomeScreen` (hero + play CTA, `BrowseGames`, `GamesPage`), common entry modals (`Howtoplaymodal`, `Playernamemodal`, `DailyBonusModal`, `DeductionModal`).
- **Core Bongo quiz rounds:** `BoxSelectScreen`, `Round1Screen`/`Round1ResultScreen`, `Round2CategoryScreen`/`Round2QuestionScreen`/`Round2ResultScreen`, `Round3QuestionScreen`/`Round3SpinScreen`, `RoundTransitionScreen`, `PowerRevealScreen`, `FinalResultScreen`, `SessionSummary`.
- **Progress/economy:** `Leaderboardscreen` (with current-player row highlight), `ProfilePage`, `BongoWalletPage`, `GameHistory`, `CommunityPage`.

### 4.4 Consistency pass

After per-screen rollout, do a sweep to ensure one radius/shadow/spacing scale, consistent button hierarchy (one primary action per screen), and that gold is reserved for the primary action / key stats while cyan carries secondary emphasis. Remove now-dead color declarations.

### 4.5 Responsiveness & non-regression

- Mobile-first (PWA / WhatsApp-share audience): verify each re-themed screen at small widths and desktop.
- Visual-only: each screen must still function identically — smoke-test navigation, game flow through all rounds, leaderboard, wallet, profile.

## 5. Data & interfaces

- **CSS only.** New/updated: `src/styles/theme.css` (tokens), shared base-component styles, and edits to the per-surface CSS/inline styles listed in §4.3. No Firestore, functions, or routing changes.

## 6. Risks & mitigations

- **Large surface area / hard-coded hex sprawl** → work screen-by-screen against the §4.3 checklist; grep for literal hexes on each screen to confirm none remain.
- **Visual regressions** → before/after check per screen; keep diffs visual-only; smoke-test the full core-game flow.
- **Inline styles** (many screens style inline, not via CSS files) → tokens exposed as CSS variables are still usable in inline `style` via `var(--bq-...)`; convert inline hexes to `var()` references.
- **Scope creep into mini-games** → hard boundary: only the §4.3 list; mini-games untouched.

## 7. Build sequence

1. **Tokens** (§4.1) — define the full token set in `theme.css`.
2. **Base components** (§4.2) — buttons, cards, modals, chips.
3. **App shell** (§4.3) — nav, sidebar, top bars, loader, install banner.
4. **Home + entry modals** (§4.3).
5. **Core game rounds + results** (§4.3).
6. **Progress/economy screens** (§4.3).
7. **Consistency pass + dead-color cleanup** (§4.4) and **responsive/non-regression sweep** (§4.5).

## 8. Success criteria

- All player shell + core-game screens in §4.3 render in Refined Neon, consuming tokens — **no hard-coded hexes remain** on those screens (verified by grep).
- Buttons/cards/modals are visually consistent across the shell (one scale, clear primary/secondary hierarchy).
- No functional or responsive regressions: full core-game flow, leaderboard, wallet, and profile work at mobile and desktop widths.
- `theme.css` token set is complete and ready for the retention slice and later screens to adopt.
