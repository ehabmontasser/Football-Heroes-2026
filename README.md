# Football Heroes 2026

A mobile-first football game that runs in the browser. Pick one of the 32 nations from the 2026 World Cup Round of 32 and play a full 90 minutes squeezed into the time you choose.

- 32 nations; the 16 that reached the Round of 16 carry a **TOP 16** badge
- Fictional 18-player squads with ratings
- Arcade 11-a-side matches: two halves, stoppage time, throw-ins, corners and goal kicks
- Match length of 4, 6, 10, 14 or 20 real minutes (10 by default)
- Easy, Normal or Hard computer opponent
- Online 2-player matches against a friend on another device
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

## Playing online

1. On the home screen, tap **PLAY ONLINE**, then **CREATE ROOM** and pick your team.
2. Share the 4-letter room code, or tap **SHARE INVITE LINK** and send the link.
3. Your friend taps **PLAY ONLINE**, enters the code (or just opens the link) and picks a different team.
4. The room creator chooses the match length and taps **KICK OFF**.

How it works: the room creator's browser runs the match and streams it to the other player about 30 times a second over Supabase Realtime; the other player's controls travel back the same way. To hide the delay, the joining player's own footballer moves instantly on their screen and is gently corrected to match the host. Passes, shots and tackles still take one round trip, and the room creator's connection matters most. The delay to your opponent shows next to the match clock (yellow above 200 ms).

- Online matches don't pause. The pause button opens a menu over the live game.
- If either player leaves or the connection drops for 15 seconds, the match ends and isn't saved.
- Finished online matches are saved to both players' Match History with the opponent's name.
- Supabase's free plan includes a monthly Realtime message allowance; a 10-minute online match uses roughly 20,000 to 35,000 messages, depending on how much the joining player moves.

## Match history (Supabase)

Every finished match is saved to the **Football Heroes 2026** Supabase project and listed on the **Match History** screen.

- On the first visit the game asks for a player name and runs an hCaptcha human check, then signs the browser in anonymously. There is no password; the history belongs to that browser. Tap your name on the home screen to change it, or tap **NEW PLAYER** there to start over with a new name (the old player's history can't be recovered on that device).
- **Play without saving** skips the sign-in; the name is kept on the device only.
- Row level security keeps every player's matches private (see `supabase/migrations/`).
- If Supabase can't be reached, the game still plays; the match just isn't saved.
- The project URL, publishable key and hCaptcha site key are in `src/data/cloud.js`. All three are designed to be public; access is controlled by the database policies and the hCaptcha secret stored in Supabase Auth (Authentication > Attack Protection).

Database changes go in `supabase/migrations/` as timestamped `.sql` files. The Supabase GitHub integration applies them to the project when they're merged to `main`.

## Project structure

```
index.html            App shell
src/main.js           Screen router and shared state
src/data/             Teams, ratings, fictional name pools, Supabase client
src/game/             Match engine, AI, physics, input and canvas renderer
src/net/              Online rooms (Supabase Realtime) and the host/guest wire format
src/ui/               Screens and UI components
design-system/        Brand guide, design tokens and logos
supabase/             Supabase config and database migrations
```

All UI is built from the tokens in `design-system/`. Read `design-system/BRAND.md` before adding screens or components.

## Notes

Country names are real; players are fictional. The game uses no club or federation crests and no player likenesses. Kits are shown as color swatches instead of flags.
