// Pitch geometry (meters) and movement helpers. The pitch is vertical:
// x runs across (0..PITCH_W), y runs end to end (0..PITCH_L).

export const PITCH_W = 68;
export const PITCH_L = 105;
export const GOAL_W = 7.32;
export const GOAL_DEPTH = 2;
export const BOX_W = 40.32;
export const BOX_D = 16.5;
export const SIX_W = 18.32;
export const SIX_D = 5.5;
export const CENTER_R = 9.15;

export const PLAYER_R = 0.9; // collision radius
export const CONTROL_R = 1.1; // distance at which a player can take a loose ball
export const BALL_FRICTION = 1.1; // exponential decay rate of ball speed (1/s)
export const SHOT_FRICTION = 0.45; // struck shots carry further
export const PLAYER_ACCEL = 9; // how fast velocity reaches the desired velocity (1/s)

export const GOAL_X0 = PITCH_W / 2 - GOAL_W / 2;
export const GOAL_X1 = PITCH_W / 2 + GOAL_W / 2;

export const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const lerp = (a, b, t) => a + (b - a) * t;

export function norm(x, y) {
  const len = Math.hypot(x, y);
  return len > 1e-6 ? [x / len, y / len] : [0, 0];
}

// Base running speed in m/s from a 0-99 pace attribute.
export const runSpeed = (pace) => 5.2 + (pace / 100) * 2.6;

// Initial speed needed for a ground pass to arrive at `d` meters with some pace left.
export const passSpeed = (d) => clamp(d * BALL_FRICTION + 5, 9, 27);

// Move a player toward a desired velocity with smooth acceleration.
export function steer(p, dvx, dvy, dt) {
  const k = 1 - Math.exp(-PLAYER_ACCEL * dt);
  p.vx += (dvx - p.vx) * k;
  p.vy += (dvy - p.vy) * k;
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  const sp = Math.hypot(p.vx, p.vy);
  if (sp > 0.6) {
    p.fx = p.vx / sp;
    p.fy = p.vy / sp;
  }
}

// Velocity that moves a player toward a target, easing in near the spot.
export function seek(p, tx, ty, maxSpeed) {
  const dx = tx - p.x;
  const dy = ty - p.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.3) return [0, 0];
  const s = Math.min(maxSpeed, d * 2.2);
  return [(dx / d) * s, (dy / d) * s];
}

// Push overlapping players apart.
export function separate(players) {
  const min = PLAYER_R * 2;
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const a = players[i];
      const b = players[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d > 0 && d < min) {
        const push = (min - d) / 2;
        const nx = dx / d;
        const ny = dy / d;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
      }
    }
  }
}

// Where a moving ball crosses the line y = lineY (null if it never gets there).
export function crossingX(bx, by, vx, vy, lineY, friction = BALL_FRICTION) {
  if (Math.abs(vy) < 1e-3) return null;
  const t = (lineY - by) / vy;
  if (t < 0) return null;
  // Account for friction: total travel is v / k, so check reach first.
  const speed = Math.hypot(vx, vy);
  const reach = speed / friction;
  const travel = Math.hypot(vx * t, vy * t);
  if (travel > reach) return null;
  return bx + vx * t;
}
