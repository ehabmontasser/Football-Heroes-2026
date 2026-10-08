# Football Heroes 2026

A mobile football (soccer) game. Every UI you build must follow the design system in `design-system/`.

## Design system

- `design-system/BRAND.md`: the brand guide. Read it before building any screen or component.
- `design-system/tokens.json`: source of truth for colors, type, spacing, radius. Each token has a `usage` note saying where it goes.
- `design-system/tokens.css`: the same tokens as CSS variables (`var(--sun-gold)`) plus type classes (`.display-xl`, `.label`, ...). Use it directly on web; for other engines (Unity, Flutter, etc.) generate theme constants from `tokens.json`, never retype values.
- `design-system/logos/`: `football-heroes-logo.png` (full lockup) and `football-heroes-shield.png` (app icon / small sizes).

## Rules

- Use tokens only. No hard-coded hex colors, font sizes, spacing or radii that are not in `tokens.json`. If something is missing, propose a new token instead of inventing a value.
- Screen ground `sky-600`, cards `navy-900`, HUD capsules `navy-950`, 2px `frame-blue` card stroke.
- Text on `sun-gold`, `badge-yellow`, `cyan-energy`, `featured-lime` is `navy-950`, never white.
- One `cta-red` primary action per screen; one `featured-lime` card per screen.
- Headlines and buttons UPPERCASE in Barlow Condensed italic; body in Barlow, sentence case; counters upright.
- Keep text contrast at 4.5:1 or better (3:1 for 24px+ bold).
- Never recolor, stretch or retype the logo; place it only on `navy-950`, `navy-900` or `sky-600`.
- Never use real clubs, federations, crests or player likenesses.

## Known gaps

- No icon set yet: use simple solid white glyphs, 20-24px, one weight.
- No components defined yet: build them from the tokens and record any new pattern in `design-system/BRAND.md`.
- Logos are PNG with a navy background; vector/transparent versions are pending.
