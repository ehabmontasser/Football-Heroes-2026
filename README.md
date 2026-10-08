# Football Heroes 2026

A mobile-first football game that runs in the browser. Pick one of the 32 nations from the 2026 World Cup Round of 32 and play a full 90 minutes squeezed into the time you choose.

- 32 nations; the 16 that reached the Round of 16 carry a **TOP 16** badge
- Fictional 18-player squads with ratings
- Arcade 11-a-side matches: two halves, stoppage time, throw-ins, corners and goal kicks
- Match length of 4, 6, 10, 14 or 20 real minutes (10 by default)
- Easy, Normal or Hard computer opponent
- Touch controls on phones, keyboard on desktop

## Running the game

The game is plain HTML, CSS and JavaScript with no build step and nothing to install. It uses JavaScript modules, so it has to be served over HTTP; opening `index.html` straight from disk will not work.

1. Install [Python 3](https://www.python.org/downloads/) if you don't have it.
2. From the project folder, start a local server:

   ```bash
   python -m http.server 5173
   ```

3. Open <http://localhost:5173> in your browser.

To play on your phone, connect it to the same Wi-Fi network and open `http://<your-computer's-IP>:5173`.

Any other static file server works too, for example `npx serve`.

### Testing shortcut

Add `?duration=0.5` to the URL to play a 30-second match, which is handy for checking half time and full time quickly.

## Controls

You control the player with the yellow ring. The game switches you to the best-placed teammate automatically, and you always attack up the screen, including after the teams change ends at half time.

| Action | Touch | Keyboard |
|---|---|---|
| Move | Drag the joystick | WASD or arrow keys |
| Pass | Tap **PASS**; aim with the joystick | Space or J |
| Shoot | Hold **SHOOT** to power up, release to shoot | Hold K, release to shoot |
| Switch player (without the ball) | Tap **SWITCH** (the PASS button) | Space or J |
| Tackle (without the ball) | Tap **TACKLE** (the SHOOT button) near the ball carrier | K |
| Sprint | Hold **SPRINT** | Shift or L |
| Pause | Tap the pause button | P or Esc |

Tips:

- Shot power shows as a bar under your player. If it turns red the shot is over-hit and may fly wide.
- Holding the joystick left or right while you shoot aims for that side of the goal.
- At kickoffs, throw-ins and corners, tap **PASS** to take it, or wait and it is taken for you.

## Project structure

```
index.html            App shell
src/main.js           Screen router and shared state
src/data/             Teams, ratings and fictional name pools
src/game/             Match engine, AI, physics, input and canvas renderer
src/ui/               Screens and UI components
design-system/        Brand guide, design tokens and logos
```

All UI is built from the tokens in `design-system/`. Read `design-system/BRAND.md` before adding screens or components.

## Notes

Country names are real; players are fictional. The game uses no club or federation crests and no player likenesses. Kits are shown as color swatches instead of flags.
