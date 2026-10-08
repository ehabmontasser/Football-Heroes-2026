# Football Heroes 2026 brand guide

A loud, matchday-energy game UI: deep stadium blues, a gold sunburst, and slanted condensed headlines. Every screen should feel like walking out of the tunnel.

## Content fundamentals

- Headlines and buttons are UPPERCASE and short: two to three words (`QUICK MATCH`, `DAILY-REWARD`, `RATE US`).
- Body copy is sentence case, second person, present tense: "Win 3 matches to unlock the Elite League."
- No emoji in UI text. Numbers are digits, with thousands separators (`18,450`).

## Color

- Build every screen on `sky-600` with cards on `navy-900` and HUD capsules on `navy-950`.
- `sun-gold` is the brand's signature: use it for the hero sunburst, coins and trophies, not for body text grounds.
- Give each menu destination its own fill so it is findable at a glance: `store-purple` for Store, `reward-pink` for Daily reward, `navy-900` for events.
- Outline standard cards and capsules with a 2px `frame-blue` stroke. Reserve `featured-lime` for the single featured mode card on a screen.
- `cta-red` is for one primary monetisation action per screen. `ad-red` marks sponsored buttons with a small AD tag and nothing else.
- Text on `sun-gold`, `badge-yellow`, `cyan-energy`, `featured-lime` is always `navy-950`. Text on `reward-pink` is white only at 24px+ bold.
- `pitch-green` is the ground of the bottom utility bar.

## Type

- Display family is Barlow Condensed (Google Fonts), heavy and italic: `display-xl` for mode cards, `display-lg` for events, `title` for tiles.
- UI family is Barlow: `label` for buttons, `body` for copy, `caption` for badges.
- Counters use `numeric`, upright, never italic.
- Load both from Google Fonts: Barlow Condensed italic 700 and 800, Barlow 500, 600 and 700.

## Shape and spacing

- Cards and tiles: `radius-md`, padding `space-3`, gaps `space-2`. HUD capsules: `radius-pill`. Tags and bars: `radius-sm`.
- Screen margin `space-4`; `space-6` between the HUD row and the card grid.
- The slant is the motif: italic display type, diagonal stripes on kits and banners, ribbons cut at an angle.
- Depth comes from layered blues and the colored stroke, not from drop shadows.
- Focus ring: 3px solid `badge-yellow`, 2px offset.

## Imagery

- Hero art: two players in kit, three-quarter body, celebrating, set against a stadium with the gold sunburst bleeding in from the top left.
- Confetti in brand colors (`badge-yellow`, `reward-pink`, `cyan-energy`) is allowed in hero and reward moments only.
- Kits use invented crests only. Never use real clubs, federations or player likenesses.

## Logo and iconography

- Use the full logo (`logos/football-heroes-logo.png`: shield, FOOTBALL HEROES wordmark, gold 2026) on splash, loading and store screens. Minimum width 240px.
- Use the shield alone (`logos/football-heroes-shield.png`) for the app icon, HUD corner and anywhere under 240px wide. Minimum 48px.
- Both files carry their own navy ground: place them only on `navy-950`, `navy-900` or `sky-600`, never on gold, red or photo backgrounds.
- Keep clear space around the logo equal to the shield's gold border width x4 (about a quarter of the shield's width).
- Never recolor, stretch, rotate, add shadows or retype the wordmark.
- No icon set yet: use simple solid white glyphs at 20-24px, one weight, on colored tiles.

## Logo files


- `football-heroes-logo.png` (1900 x 1160): primary lockup. Shield left, white condensed italic FOOTBALL HEROES, gold 2026, two gold slanted rules. Splash, loading, store and marketing. Min width 240px.
- `football-heroes-shield.png` (1024 x 1024): the shield mark alone, centered on navy. App icon, HUD, favicons, small placements. Min 48px.

Mark colors (measured from the artwork, close to but not identical to the tokens): gold #f9b30a (near `sun-gold`), red #ec151a (warmer than `cta-red`), blue #012888 (near `sky-600`), navy #020a38 (near `navy-950`), white.

Place only on `navy-950`, `navy-900` or `sky-600`. Do not recolor, stretch, rotate or add effects. A vector (SVG) master and a transparent version are still to come.

## Components (v1, from the Quick Match build)

Implemented in `src/styles.css` and `src/ui/components.js`. Build new screens from these before inventing new patterns.

- **Button**: `radius-md`, min height `size-touch`. Primary = `cta-red` fill, `title` type (the single main action on a screen). Secondary = `navy-700` fill + `frame-blue` stroke. Small buttons and pills use `label` type.
- **Card**: `navy-900`, `stroke-card` `frame-blue`, `radius-md`, padding `space-3`. Featured card swaps the stroke to `featured-lime` and carries a slanted `sun-gold` ribbon top right.
- **Capsule (HUD)**: `navy-950`, `frame-blue` stroke, `radius-pill`. Counters inside use `numeric` (upright).
- **Chip** (filters, options): `navy-950` pill with `frame-blue` stroke; selected = `cyan-energy` fill with `navy-950` text.
- **Badge**: `badge-yellow`, `navy-950` `caption` text, `radius-sm` (e.g. TOP 16).
- **Kit swatch**: two-tone slanted band of a team's kit tokens with an `ink` stroke. Stands in for flags so no national emblems or federation marks appear.
- **Team tile**: card with kit swatch, `numeric` rating, `title` name, finish in `ink-muted`, badges, and a `navy-950` SQUAD footer. Selected = `cyan-energy` stroke.
- **Action bar**: fixed bottom bar on `pitch-green` with a selection summary and the primary button.
- **Dialog**: card on a `navy-950` scrim at 80%.
- **Match HUD**: scoreboard capsule (kit swatch, code, score), clock capsule (match minute in `cyan-energy`, real time left in `ink-muted`), pause icon button.
- **Match banner**: slanted ribbon, `display-xl`. GOAL uses `sun-gold` with `navy-950` text; KICK OFF / FULL TIME use `navy-950` with `frame-blue` stroke.
- **Touch controls**: joystick (`size-joystick`) and round action buttons (`size-control`): SHOOT `cta-red`, PASS `navy-700`, SPRINT `navy-950` at `size-touch`. Glyphs are solid white, 24px.
- **Pitch (canvas)**: `pitch-green` ground, `ink` lines at 80% opacity, mowing stripes as a 3.5% `ink` wash. Your controlled player gets a `badge-yellow` ring and marker. Goalkeepers wear `cyan-energy` (yours) or `sun-amber` (opponent).

## Tokens added in v1.1 (proposed)

`size` group in `tokens.json`: `stroke-card` 2px, `stroke-focus` 3px, `size-shield-sm` 48px, `size-logo` 240px, `size-touch` 56px, `size-control` 80px, `size-joystick` 128px, `size-content-max` 960px. These values were already implied by the rules above; they are now tokens so code never hard-codes them.

`tokens.css` now also loads upright Barlow Condensed 700, which `numeric` needs (only the italic faces were loaded before, so counters rendered slanted).
