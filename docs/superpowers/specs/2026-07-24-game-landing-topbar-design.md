# Game Landing Pages — Shared Top Bar + Settings Menu

**Date:** 2026-07-24

## Goal

Redesign the first landing page of every game **except Bongo Quiz** so each has:
1. The **same-looking top bar** as the main home page (streamlined variant).
2. A **⚙️ Settings** icon whose menu contains **How to Play**, **Game History**,
   **Share**, and **Edit Profile** for that game.

Games in scope: General Knowledge, Bible Quiz, Biology Quiz, Math Quiz, Sudoku,
Sum Ten, Connect Dots. **Bongo Quiz is untouched.**

## Approach

Build ONE new self-contained shared component, `AppTopBar`, and drop it into each
game's landing page. Reuse the existing `.bongo-top-bar` / `.topbar-*` styles in
`HomeScreen.css` so it matches the main bar exactly. Do NOT refactor HomeScreen's own
bar (keeps the main page low-risk).

## Streamlined top bar contents

- **Logo** → navigate to `/` (home portal).
- **Coin balance** — self-syncing via `getBongoCoinBalance()` + `bongo:wallet-updated`
  event listener (same as HomeScreen).
- **Alerts bell + panel** — global announcements from Firestore `announcements`
  collection with read-tracking in `localStorage` (`bongo_read_announcements`), styled
  with the existing `.home-notification-*` classes.
- **Wallet** button → `window.location.href = '/?tab=wallet'`.
- **⚙️ Settings gear** → dropdown built from a `settingsItems` prop.

Dropped vs main bar: Rewards/Quests panel, desktop nav links, personal-best badge,
auth buttons (Bongo-arena-specific).

## Component API

```
src/component/game/AppTopBar.tsx

interface SettingsItem { key: string; label: string; icon: ReactNode; onClick: () => void; }
interface Props { settingsItems: SettingsItem[]; }
```

Everything else (coins, alerts) is self-managed inside the component.
CSS: reuse existing classes; add a small `.topbar-settings-menu` dropdown block +
`.topbar-settings-btn` (gear) in `HomeScreen.css`.

## Per-game changes (each of the 7 games)

1. Remove the old header/hamburger drawer markup + its open/close state.
2. Render `<AppTopBar settingsItems={...} />` at the top.
3. Wire settings items to the game's EXISTING modals (how-to-play, history, share,
   edit-profile) — no modal content rewritten, just re-triggered.
4. Add top padding to the content so it clears the fixed bar.

Games with differing modal state today (mapped in exploration):
- GK (`MainMenu`), Bible (`MainMenu`) — callbacks / `showHistory`.
- Biology (`activeModal` enum), Math (`showHtp`/`showHistory`), Sudoku, Sum Ten,
  Connect Dots — adapt per file.

## General Knowledge — new Game History

GK has no history today. Add one following the existing per-game pattern: fetch from a
`gkQuizSessions` Firestore collection by player phone, render in a modal matching the
other games' history modals.

## Rollout

Build `AppTopBar` → wire **Bible Quiz** first as the template → verify live → apply to
the other six → add GK history → verify each.

## Out of scope

- No change to Bongo Quiz / HomeScreen top bar.
- No change to gameplay, scoring, or the modals' internal content (except adding GK
  history).
