# Look-and-Feel Refresh (Refined Neon) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh the player shell + core Bongo quiz to the "Refined Neon" look (gold + cyan on deep navy; magenta/violet/green retired as hero colors) by retuning the existing global design tokens and routing hard-coded hexes on target screens through those tokens.

**Architecture:** BongoQuiz already ships a global token system in `src/styles/theme.css` (`--bg`, `--gold`, `--purple`, `--cyan`, radius/shadow/spacing) plus utility classes (`.btn`, `.card`), imported app-wide via `src/index.css`. The refresh (1) retunes those token *values* to Refined Neon — which instantly re-themes every token-consuming screen — then (2) converts remaining hard-coded off-palette hexes on the in-scope screens to tokens. Purple/green tokens stay *defined* (two mini-games consume them) but are retired from in-scope surfaces.

**Tech Stack:** React 19 + Vite 6, plain CSS (per-screen files in `src/styles/` + inline styles in `.tsx`), Tailwind v4 present but theming is via CSS custom properties.

**Verification model (no unit tests for CSS):** every task verifies with `npm run build` (must succeed) + a `grep` proving no off-palette literals remain in the touched file + a manual smoke-test note. Off-palette hero literals to eliminate on in-scope surfaces:

```
#7c3aed #7b61ff #8b5cf6 #c000ff #8b2cff #a855f7 #A855F7   (violet/purple)
#ff28f4 #ff00d4 #f0abfc #c084fc #a78bfa #d946ef           (magenta/pink)
```
Combined grep pattern used throughout (case-insensitive):
```
grep -oiE "#7c3aed|#7b61ff|#8b5cf6|#c000ff|#8b2cff|#a855f7|#ff28f4|#ff00d4|#f0abfc|#c084fc|#a78bfa|#d946ef"
```

**Token mapping (apply consistently across all tasks):**
| Old (off-palette) | Replace with |
|---|---|
| any violet/purple hero hex, `var(--purple)`, `var(--grad-purple)` | `var(--gold)` for primary emphasis, else `var(--cyan)` for secondary |
| any magenta/pink hero hex | `var(--cyan)` (or `var(--gold)` if it was the primary accent) |
| purple glow `var(--shadow-purple)` | `var(--shadow-gold)` |
| purple border `var(--border-purple)` | `var(--border-gold)` |
| raw gold hexes (`#ffd200`,`#F5C518`,`#ffd700`,`#FFD700`,`#F59E0B`) | `var(--gold)` / `var(--gold-2)` |
| raw cyan hexes (`#22d3ee`,`#06D6E0`,`#67e8f9`,`#7dd3fc`) | `var(--cyan)` / `var(--cyan-soft)` |
| raw deep-navy bg hexes (`#060914`,`#0C1238`,`#0b0f24`,`#141a33`,`#1a1a2e`) | `var(--bg)` / `var(--bg-2)` |

Keep semantic colors (`--green` success, `--red` danger) as-is — do **not** recolor genuine success/error states.

**Out of scope (do not touch):** the 8 mini-games' internal screens, `src/component/admin/**`, `src/component/support/**`. `--purple`/`--green`/`--orange`/`--grad-purple`/`--shadow-purple` remain defined in `theme.css` so token-consuming games (Biology, Sudoku) don't break.

---

## Task 1: Retune global tokens to Refined Neon

**Files:**
- Modify: `src/styles/theme.css` (`:root` block, gradients, glass-card/button utilities)

- [ ] **Step 1: Establish the smoke-test baseline**

Run: `npm run build`
Expected: build succeeds (records a known-good starting point).

- [ ] **Step 2: Retune the brand + background tokens**

In `src/styles/theme.css`, edit the token values below (leave all other tokens untouched). Keep `--purple`, `--green`, `--orange`, `--grad-purple`, `--shadow-purple`, `--border-purple` **defined** (mini-games use them) — we simply stop using them on in-scope screens.

```css
  /* ── Brand Colours (Refined Neon) ───────────────────── */
  --gold:        #FFD200;          /* was #F5C518 */
  --gold-2:      #FFB800;          /* was #F59E0B */
  --gold-dim:    rgba(255, 210, 0, 0.15);
  --cyan:        #22D3EE;          /* was #06D6E0 */
  --cyan-soft:   #7DD3FC;          /* NEW secondary-soft */
  --cyan-dim:    rgba(34, 211, 238, 0.12);

  /* Backgrounds — deepen, remove purple tint */
  --bg:          #0B0F24;          /* was #060914 */
  --bg-2:        #141A33;          /* was #0C1238 */
```

- [ ] **Step 3: Rebuild the global gradient + gold hero shadow off gold/cyan (drop purple radial)**

Replace the `--grad-bg`, `--grad-hero`, and `--shadow-gold` values:

```css
  --grad-hero:   linear-gradient(180deg, #141A33 0%, #0B0F24 100%);
  --grad-bg:     radial-gradient(ellipse at 50% 0%, rgba(255,210,0,0.10) 0%, transparent 55%),
                 radial-gradient(ellipse at 80% 80%, rgba(34,211,238,0.10) 0%, transparent 50%),
                 linear-gradient(180deg, #0B0F24 0%, #070A18 100%);
  --shadow-gold: 0 0 24px rgba(255,210,0,0.25);
```

- [ ] **Step 4: Retire purple from the shared glass-card gold variant + secondary button**

Confirm `.card-gold` uses gold rgba (it already does) and set `.btn-secondary` to carry cyan emphasis on hover instead of neutral only:

```css
.btn-secondary:hover { background: var(--bg-card-hover); color: var(--cyan); border-color: var(--border-gold); }
```

- [ ] **Step 5: Verify build + no purple/magenta introduced in theme hero paths**

Run: `npm run build`
Expected: build succeeds.
Run: `grep -nE "grad-bg|grad-hero" src/styles/theme.css`
Expected: both gradients show gold/cyan rgba, no `123,97,255` (purple) remaining in them.

- [ ] **Step 6: Smoke-test token-consuming screens (in-scope + the 2 leaky games)**

Run: `npm run dev`, then in the browser open `/` (home), play into a round, and open `/biology-quiz` and `/sudoku`.
Expected: home + core game read as gold/cyan Refined Neon; Biology and Sudoku still render legibly (they inherit the refreshed `--gold`/`--cyan`/`--bg`; note any broken contrast to fix locally in Step 7 — do NOT re-theme game layouts).

- [ ] **Step 7: (Only if a game regressed) pin the old value locally**

If Biology or Sudoku looks broken, add a scoped override in that game's own CSS root (e.g., `.biology-root { --gold: #F5C518; }`) rather than reverting the global token. If nothing regressed, skip.

- [ ] **Step 8: Commit**

```bash
git add src/styles/theme.css
git commit -m "style: retune global design tokens to Refined Neon (gold+cyan)"
```

---

## Task 2: App shell (nav, sidebar, top bars, loader, install banner)

**Files:**
- Modify: `src/styles/BottomNav.css`, `src/styles/Sidebar.css`, `src/App.css`
- Modify: `src/component/game/BottomNav.tsx`, `src/component/game/DesktopSidebar.tsx`, `src/component/game/QuizTopBar.tsx`, `src/component/game/PointsBar.tsx`, `src/component/PWAInstallBanner.tsx`, `src/App.tsx` (LoadingScreen inline `<style>` block)

- [ ] **Step 1: Enumerate off-palette + raw brand hexes in shell files**

Run:
```bash
grep -rniE "#7c3aed|#7b61ff|#8b5cf6|#c000ff|#8b2cff|#a855f7|#ff28f4|#ff00d4|#f0abfc|#ffd200|#f5c518|#ffd700|#06d6e0|#22d3ee|#1a1a2e|#060914" \
  src/styles/BottomNav.css src/styles/Sidebar.css src/App.css \
  src/component/game/BottomNav.tsx src/component/game/DesktopSidebar.tsx \
  src/component/game/QuizTopBar.tsx src/component/game/PointsBar.tsx \
  src/component/PWAInstallBanner.tsx src/App.tsx
```
Expected: a list of lines to convert.

- [ ] **Step 2: Convert each hit to a token per the mapping table**

For every line from Step 1, replace the literal with the mapped `var(--…)` token (gold hexes → `var(--gold)`, cyan → `var(--cyan)`, navy bg → `var(--bg)`/`var(--bg-2)`, any purple/magenta → `var(--gold)` primary or `var(--cyan)` secondary). In `App.tsx`'s `LoadingScreen` inline `<style>` string, replace the hard-coded `#7dd3fc`/`#00efff`/`#ffd200`/`#090014`/`#180024` with the Refined Neon equivalents (`var(--cyan-soft)`, `var(--cyan)`, `var(--gold)`, `var(--bg)`, `var(--bg-2)`).

- [ ] **Step 3: Verify no off-palette hero literals remain in shell files**

Run:
```bash
grep -rniE "#7c3aed|#7b61ff|#8b5cf6|#c000ff|#8b2cff|#a855f7|#ff28f4|#ff00d4|#f0abfc|#c084fc|#a78bfa|#d946ef" \
  src/styles/BottomNav.css src/styles/Sidebar.css src/App.css \
  src/component/game/BottomNav.tsx src/component/game/DesktopSidebar.tsx \
  src/component/game/QuizTopBar.tsx src/component/game/PointsBar.tsx \
  src/component/PWAInstallBanner.tsx src/App.tsx
```
Expected: no output.

- [ ] **Step 4: Build + smoke-test**

Run: `npm run build` → succeeds.
Run: `npm run dev`, view `/` on mobile-width and desktop-width.
Expected: bottom nav, desktop sidebar, top bar, points bar, loader, and PWA banner all render in gold/cyan; active nav item highlighted in gold; layouts unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/styles/BottomNav.css src/styles/Sidebar.css src/App.css src/component/game/BottomNav.tsx src/component/game/DesktopSidebar.tsx src/component/game/QuizTopBar.tsx src/component/game/PointsBar.tsx src/component/PWAInstallBanner.tsx src/App.tsx
git commit -m "style: re-theme app shell to Refined Neon tokens"
```

---

## Task 3: Home screen + entry modals

**Files:**
- Modify: `src/styles/HomeScreen.css` (24 off-palette literals), `src/component/game/HomeScreen.tsx`
- Modify: `src/styles/GamesPage.css` (2 `--purple` refs), `src/component/game/GamesPage.tsx`, `src/component/game/BrowseGames.tsx`
- Modify: `src/styles/Howtoplaymodal.css`, `src/styles/Playernamemodal.css`, `src/styles/DeductionModal.css`, `src/assets/modalOverlaybtn.css`
- Modify: `src/component/game/Howtoplaymodal.tsx`, `src/component/game/Playernamemodal.tsx`, `src/component/game/DailyBonusModal.tsx`, `src/component/game/DeductionModal.tsx`

- [ ] **Step 1: Enumerate off-palette + `--purple` usage**

Run:
```bash
grep -rniE "#7c3aed|#7b61ff|#8b5cf6|#c000ff|#8b2cff|#a855f7|#ff28f4|#ff00d4|#f0abfc|var\(--purple|var\(--grad-purple|var\(--shadow-purple|var\(--border-purple" \
  src/styles/HomeScreen.css src/styles/GamesPage.css src/styles/Howtoplaymodal.css \
  src/styles/Playernamemodal.css src/styles/DeductionModal.css src/assets/modalOverlaybtn.css \
  src/component/game/HomeScreen.tsx src/component/game/GamesPage.tsx src/component/game/BrowseGames.tsx \
  src/component/game/Howtoplaymodal.tsx src/component/game/Playernamemodal.tsx \
  src/component/game/DailyBonusModal.tsx src/component/game/DeductionModal.tsx
```
Expected: list of lines (≈24 in HomeScreen.css, 2 `--purple` in GamesPage.css, plus any in modals/tsx).

- [ ] **Step 2: Convert each hit to a token per the mapping table**

Replace per mapping: `var(--purple)`→`var(--gold)` (primary) or `var(--cyan)` (secondary), `var(--grad-purple)`→`var(--grad-gold)`, `var(--shadow-purple)`→`var(--shadow-gold)`, `var(--border-purple)`→`var(--border-gold)`; magenta/violet hexes → `var(--gold)`/`var(--cyan)`; raw gold/cyan/navy hexes → their tokens. Reserve gold for the single primary CTA per screen (the "Play" button); use cyan for secondary emphasis.

- [ ] **Step 3: Verify no off-palette literals/purple tokens remain**

Run the Step 1 grep again.
Expected: no output.

- [ ] **Step 4: Build + smoke-test**

Run: `npm run build` → succeeds.
Run: `npm run dev`; on `/` open the how-to-play modal, the player-name modal, and trigger the daily-bonus modal; visit the games browse list.
Expected: home hero + play CTA in gold, secondary actions in cyan, all four modals Refined-Neon and functional; game grid unchanged in layout.

- [ ] **Step 5: Commit**

```bash
git add src/styles/HomeScreen.css src/styles/GamesPage.css src/styles/Howtoplaymodal.css src/styles/Playernamemodal.css src/styles/DeductionModal.css src/assets/modalOverlaybtn.css src/component/game/HomeScreen.tsx src/component/game/GamesPage.tsx src/component/game/BrowseGames.tsx src/component/game/Howtoplaymodal.tsx src/component/game/Playernamemodal.tsx src/component/game/DailyBonusModal.tsx src/component/game/DeductionModal.tsx
git commit -m "style: re-theme home + entry modals to Refined Neon"
```

---

## Task 4: Core Bongo quiz rounds + results + transitions

**Files:**
- Modify: `src/styles/game.css`, `src/styles/BoxSelectScreen.css`, `src/styles/Round2categoryscreen.css`, `src/styles/Round3SpinScreen.css`, `src/styles/RoundTransitionScreen.css` (20 off-palette literals), `src/styles/PowerRevealScreen.css`, `src/styles/FinalResultScreen.css`, `src/styles/SessionSummary.css` (1 literal)
- Modify (inline styles): `src/component/game/BoxSelectScreen.tsx`, `Round1Screen.tsx`, `Round1ResultScreen.tsx`, `Round2CategoryScreen.tsx`, `Round2QuestionScreen.tsx`, `Round2ResultScreen.tsx`, `Round3QuestionScreen.tsx`, `Round3SpinScreen.tsx`, `RoundTransitionScreen.tsx`, `PowerRevealScreen.tsx`, `FinalResultScreen.tsx`, `SessionSummary.tsx` (all under `src/component/game/`)

- [ ] **Step 1: Enumerate off-palette + raw brand hexes across round files**

Run:
```bash
grep -rniE "#7c3aed|#7b61ff|#8b5cf6|#c000ff|#8b2cff|#a855f7|#ff28f4|#ff00d4|#f0abfc|var\(--purple|var\(--grad-purple|var\(--shadow-purple|#ffd200|#f5c518|#06d6e0|#22d3ee" \
  src/styles/game.css src/styles/BoxSelectScreen.css src/styles/Round2categoryscreen.css \
  src/styles/Round3SpinScreen.css src/styles/RoundTransitionScreen.css src/styles/PowerRevealScreen.css \
  src/styles/FinalResultScreen.css src/styles/SessionSummary.css \
  src/component/game/Round1Screen.tsx src/component/game/Round2QuestionScreen.tsx \
  src/component/game/Round3SpinScreen.tsx src/component/game/RoundTransitionScreen.tsx \
  src/component/game/FinalResultScreen.tsx src/component/game/SessionSummary.tsx \
  src/component/game/BoxSelectScreen.tsx src/component/game/PowerRevealScreen.tsx
```
Expected: list of lines (RoundTransitionScreen.css ≈20, SessionSummary.css 1, plus inline-style hits).

- [ ] **Step 2: Convert each hit to a token per the mapping table**

Apply the same mapping. For the Round 3 spin wheel and transitions (currently the most neon/magenta), route decorative colors to alternating `var(--gold)` / `var(--cyan)` so the wheel stays vibrant but on-palette.

- [ ] **Step 3: Verify no off-palette hero literals remain**

Run the combined off-palette grep (from the plan header) over all files listed in this task.
Expected: no output.

- [ ] **Step 4: Build + smoke-test the full game flow**

Run: `npm run build` → succeeds.
Run: `npm run dev`; play a full session start→Round1→Round2→Round3 spin→final result→summary.
Expected: every round, the spin wheel, transitions, power reveal, and final/summary screens render Refined Neon; scoring and navigation behave exactly as before.

- [ ] **Step 5: Commit**

```bash
git add src/styles/game.css src/styles/BoxSelectScreen.css src/styles/Round2categoryscreen.css src/styles/Round3SpinScreen.css src/styles/RoundTransitionScreen.css src/styles/PowerRevealScreen.css src/styles/FinalResultScreen.css src/styles/SessionSummary.css src/component/game/BoxSelectScreen.tsx src/component/game/Round1Screen.tsx src/component/game/Round1ResultScreen.tsx src/component/game/Round2CategoryScreen.tsx src/component/game/Round2QuestionScreen.tsx src/component/game/Round2ResultScreen.tsx src/component/game/Round3QuestionScreen.tsx src/component/game/Round3SpinScreen.tsx src/component/game/RoundTransitionScreen.tsx src/component/game/PowerRevealScreen.tsx src/component/game/FinalResultScreen.tsx src/component/game/SessionSummary.tsx
git commit -m "style: re-theme core quiz rounds + results to Refined Neon"
```

---

## Task 5: Progress & economy screens (leaderboard, profile, wallet, history, community)

**Files:**
- Modify: `src/styles/Leaderboardscreen.css`, `src/styles/ProfilePage.css` (4 `--purple` refs), `src/styles/BongoWallet.css` (30 off-palette literals), `src/styles/CommunityPage.css` (3 literals)
- Modify (inline styles): `src/component/game/Leaderboardscreen.tsx`, `src/component/game/ProfilePage.tsx`, `src/component/game/BongoWalletPage.tsx`, `src/component/game/GameHistory.tsx`, `src/component/game/CommunityPage.tsx`

- [ ] **Step 1: Enumerate off-palette + `--purple` usage**

Run:
```bash
grep -rniE "#7c3aed|#7b61ff|#8b5cf6|#c000ff|#8b2cff|#a855f7|#ff28f4|#ff00d4|#f0abfc|var\(--purple|var\(--grad-purple|var\(--shadow-purple|var\(--border-purple" \
  src/styles/Leaderboardscreen.css src/styles/ProfilePage.css src/styles/BongoWallet.css src/styles/CommunityPage.css \
  src/component/game/Leaderboardscreen.tsx src/component/game/ProfilePage.tsx \
  src/component/game/BongoWalletPage.tsx src/component/game/GameHistory.tsx src/component/game/CommunityPage.tsx
```
Expected: list (BongoWallet.css ≈30, ProfilePage.css 4 `--purple`, CommunityPage.css 3).

- [ ] **Step 2: Convert each hit to a token per the mapping table**

Apply the mapping. On the leaderboard, keep `--gold`/`--rank-1` for 1st place, and make the **current-player row** highlight use `var(--cyan)` (background tint `var(--cyan-dim)` + `var(--cyan)` text) so "you" stands out consistently with the mockup.

- [ ] **Step 3: Verify no off-palette literals/purple tokens remain**

Run the Step 1 grep again.
Expected: no output.

- [ ] **Step 4: Build + smoke-test**

Run: `npm run build` → succeeds.
Run: `npm run dev`; open leaderboard, profile, wallet (both tabs), game history, community.
Expected: all render Refined Neon; current-player leaderboard row highlighted in cyan; wallet coin balances/gold accents on-palette; layouts and data unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/styles/Leaderboardscreen.css src/styles/ProfilePage.css src/styles/BongoWallet.css src/styles/CommunityPage.css src/component/game/Leaderboardscreen.tsx src/component/game/ProfilePage.tsx src/component/game/BongoWalletPage.tsx src/component/game/GameHistory.tsx src/component/game/CommunityPage.tsx
git commit -m "style: re-theme progress + economy screens to Refined Neon"
```

---

## Task 6: Consistency pass, dead-color cleanup, responsive sweep

**Files:**
- Review/modify: any in-scope file flagged below; `src/styles/theme.css` (remove now-unused declarations only if confirmed unused)

- [ ] **Step 1: Global off-palette scan across all in-scope surfaces**

Run:
```bash
grep -rniE "#7c3aed|#7b61ff|#8b5cf6|#c000ff|#8b2cff|#a855f7|#ff28f4|#ff00d4|#f0abfc|#c084fc|#a78bfa|#d946ef" \
  src/App.tsx src/App.css src/component/PWAInstallBanner.tsx \
  src/styles/ src/component/game/
```
Expected: no output (note: `src/styles/` and `src/component/game/` include a few not-yet-in-scope files like `BongoMarket.css`, `TournamentPlayPage.*`, `AdminTournament.css`, `TournamentPlayPage.tsx` — ignore hits in those; they are follow-up scope). If any in-scope file still has a hit, convert per the mapping table and re-run.

- [ ] **Step 2: Button-hierarchy consistency check**

Manually review the in-scope screens: each screen has exactly one gold primary action; secondary actions use `.btn-secondary`/cyan; destructive uses `.btn-danger`. Fix any screen with two competing gold CTAs by demoting the lesser to secondary.

- [ ] **Step 3: Remove dead color declarations (safe only)**

Run: `grep -rn "shadow-purple\|border-purple\|grad-purple\|var(--purple" src/component/game src/styles/HomeScreen.css src/styles/BongoWallet.css src/styles/ProfilePage.css src/styles/GamesPage.css`
Expected: no output (in-scope files no longer reference purple tokens). **Do not** delete the `--purple`/`--green`/`--orange` definitions from `theme.css` — mini-games still consume them.

- [ ] **Step 4: Responsive + regression sweep**

Run: `npm run dev`; at mobile width (~390px) and desktop width, walk: home → full game flow → leaderboard → profile → wallet → community. Also re-open `/biology-quiz` and `/sudoku`.
Expected: no layout breakage, no unreadable contrast, no functional regressions anywhere; the two leaky games still legible.

- [ ] **Step 5: Final build**

Run: `npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "style: Refined Neon consistency pass + dead-color cleanup"
```

---

## Notes for the executor

- **Never** edit files under `src/component/admin/`, `src/component/support/`, or any mini-game directory (`BibleQuiz`, `BiologyQuiz`, `MathQuiz`, `GeneralKnowledgeQuiz`, `Sudoku`, `StreetBongo`, `ConnectDots`, `SumTen`, `GeneralKnowledge`) except the local `--gold` override escape hatch in Task 1 Step 7 if a game visibly regressed.
- Prefer `var(--…)` tokens over new hexes everywhere. If you need a shade that has no token, add a token to `theme.css` rather than hard-coding.
- This is visual-only. If a change alters behavior, layout logic, or routing, you've gone too far — revert that part.
