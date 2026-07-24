# Browse Section Redesign — "Featured Hero + Rich Grid"

**Date:** 2026-07-24
**Component:** `src/component/game/BrowseGames.tsx`
**Styles:** `src/styles/HomeScreen.css` (plain CSS, `.home-browse-*` classes)

## Problem

The current Browse section (homepage + game landing pages) has four issues the user
wants fixed:

1. **Cropped posters** — cards use `aspect-ratio: 1/1` but poster art ranges from 0.99
   to 1.40 aspect ratio (avg ~1.25, mostly landscape), so wider posters get chopped.
2. **Flat, cheap-looking cards** — no depth, hover, glow, or "play" affordance.
3. **Thin chrome** — the `Browse` heading, search bar, and filter pills feel unrefined.
4. **Off layout/spacing** — sizing and column counts need rework.

## Direction

Bolder redesign that keeps the existing **dark purple casino theme + gold accent**.
Plain CSS only (extend `HomeScreen.css`), no new dependencies. **No fake data** —
only real, curated metadata.

## Data changes (`BrowseGames.tsx`)

Add two real fields to the `GameItem` type and each entry:

- `category: 'Trivia' | 'Numbers' | 'Puzzle'` — derived from the game type.
- `featured?: boolean` — marks the flagship (Bongo Quiz) as the hero.

| Game | category | featured | tag |
|---|---|---|---|
| Bongo Quiz | Trivia | ✅ | HOT |
| General Knowledge | Trivia | | NEW |
| Bible Quiz | Trivia | | NEW |
| Biology Quiz | Trivia | | NEW |
| Math Quiz | Numbers | | NEW |
| Sum Ten | Numbers | | HOT |
| Sudoku | Puzzle | | NEW |
| Connect Dots | Puzzle | | HOT |

## Layout

```
┌──────────────────────────────────────────────┐
│ Browse            [ 🔍 Search games        ]  │  polished header + search
│ Currently viewing: All Games                   │
├──────────────────────────────────────────────┤
│ ╔══════════ FEATURED ══════════╗              │
│ ║  [poster art]      Bongo Quiz ║  hero =      │
│ ║                    Trivia·HOT ║  Bongo Quiz  │
│ ║                    [ ▶ Play ] ║  (flagship)  │
│ ╚═══════════════════════════════╝              │
│ [All Games] [New] [Timed] [Hot]  glow pills    │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐                    │
│ │art │ │art │ │art │ │art │  rich cards        │
│ │Titl│ │Titl│ │Titl│ │Titl│  4:3, minimal crop │
│ │Tr·N│ │Pz·N│ │Nu·N│ │Tr·N│                    │
│ └────┘ └────┘ └────┘ └────┘                    │
└──────────────────────────────────────────────┘
```

### Featured hero
- Renders the `featured` game (Bongo Quiz) as a large **landscape** card.
- Poster art with a gradient scrim, large title, `category · tag` chips, and a
  prominent gold **▶ Play** button linking to the game path.
- **Visibility rule:** shown only in the default view — `filter === 'all'` **and** no
  search term. When the user filters or searches, the hero collapses and only the
  results grid shows. This keeps the spotlight relevant instead of showing a Trivia
  flagship while the user browses Puzzles.
- Desktop: art left / text right. Mobile: stacked (art top, text below).

### Rich grid cards
- **4:3** poster area (`aspect-ratio: 4/3`, `object-fit: cover`) — matches the avg
  poster ratio so cropping is minimal.
- NEW/HOT chip pinned on the art; bottom gradient scrim for legibility.
- Below/over the art: title + `category · tag` row.
- **▶ Play** affordance fades in on hover.
- The grid always excludes the hero game (no duplicate) and the `exclude` prop game.

## Interactions & polish

- **Hover:** card lifts (`translateY`), soft purple glow, play overlay fades in.
- **Filter/search change:** CSS-only fade/slide transition on the grid.
- **Empty state:** friendly "No games found" message when search matches nothing
  (currently renders blank).
- **Chrome:** fuller search bar with focus glow, larger pills with animated active
  gold state, crisper `Browse` heading.

## Responsive

- Hero: full width.
- Grid: **2 cols** mobile → **3** tablet (≥768px) → **4** desktop (≥1024px).
  (Rich cards are larger than today's, so fewer per row than the current 3/4/5.)

## Accessibility

- Keep real `<button>` elements, `role="tablist"` pills, and `aria-label`s.
- Add visible `:focus-visible` states on cards, pills, hero, and search.

## Integration impact

- Homepage (`HomeScreen.tsx`): drop the now-redundant `exclude="Bongo Quiz"` so the
  flagship can be the hero. Grid still excludes the hero automatically.
- Individual game landing pages keep passing `exclude="<that game>"`; Bongo remains the
  hero there, and the current game is filtered out of the grid.

## Out of scope

- No backend / Firebase wiring, no live player counts or ratings.
- No changes to game routes or the game list beyond the two new metadata fields.
