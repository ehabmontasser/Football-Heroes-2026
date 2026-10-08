// Team shape and decision making for computer-controlled players.

import {
  PITCH_W, PITCH_L, BOX_D, BOX_W, GOAL_W, clamp, dist, norm, runSpeed, seek, passSpeed, crossingX, SHOT_FRICTION,
} from './physics.js';

// 1-4-4-2 slots for the 11 starters, in squad order. fx: 0..1 across,
// fd: 0..1 depth from own goal line toward the opponent's.
export const FORMATION = [
  { fx: 0.5, fd: 0.02 },
  { fx: 0.14, fd: 0.24 }, { fx: 0.38, fd: 0.19 }, { fx: 0.62, fd: 0.19 }, { fx: 0.86, fd: 0.24 },
  { fx: 0.14, fd: 0.46 }, { fx: 0.38, fd: 0.42 }, { fx: 0.62, fd: 0.42 }, { fx: 0.86, fd: 0.46 },
  { fx: 0.4, fd: 0.64 }, { fx: 0.6, fd: 0.66 },
];

// Difficulty tunes the computer team only. Your teammates always play at "normal".
export const DIFFICULTY = {
  easy: { speed: 0.9, react: 0.55, passError: 3.2, shotError: 4.2, tackle: 0.75, shootRange: 18, gk: -16 },
  normal: { speed: 1.0, react: 0.35, passError: 1.8, shotError: 3.0, tackle: 0.95, shootRange: 22, gk: 0 },
  hard: { speed: 1.07, react: 0.2, passError: 0.9, shotError: 2.2, tackle: 1.35, shootRange: 25, gk: 6 },
};

export const depthOf = (team, y) => (team.dir < 0 ? (PITCH_L - y) / PITCH_L : y / PITCH_L);
export const worldY = (team, fd) => (team.dir < 0 ? PITCH_L - fd * PITCH_L : fd * PITCH_L);
export const oppGoalY = (team) => (team.dir < 0 ? 0 : PITCH_L);
export const ownGoalY = (team) => (team.dir < 0 ? PITCH_L : 0);

export function slotTarget(match, p) {
  const team = p.team;
  const ball = match.ball;
  const slot = FORMATION[p.slot];
  const ballFd = depthOf(team, ball.y);
  const ballFx = ball.x / PITCH_W;
  const attacking = match.possessionTeam() === team;
  let fd = slot.fd + (ballFd - 0.45) * 0.55 + (attacking ? 0.08 : -0.04);
  let fx = slot.fx + (ballFx - 0.5) * 0.35;
  if (attacking && p.role === 'FW') fd += 0.06;
  if (!attacking) fx = 0.5 + (fx - 0.5) * 0.85; // stay compact when defending
  // Defenders never drift past the halfway line much; forwards hold the line.
  if (p.role === 'DF') fd = clamp(fd, 0.08, 0.62);
  if (p.role === 'MF') fd = clamp(fd, 0.18, 0.82);
  if (p.role === 'FW') fd = clamp(fd, 0.3, 0.9);
  return [clamp(fx, 0.04, 0.96) * PITCH_W, worldY(team, clamp(fd, 0.03, 0.95))];
}

export function kickoffTarget(p, kickingTeam) {
  const slot = FORMATION[p.slot];
  let fd = Math.min(slot.fd * 0.75, 0.45);
  if (p.role === 'FW' && p.team === kickingTeam) fd = 0.49;
  return [slot.fx * PITCH_W, worldY(p.team, fd)];
}

function nearestOpponentDist(match, p) {
  let best = Infinity;
  for (const o of match.opponentsOf(p.team).players) best = Math.min(best, dist(p.x, p.y, o.x, o.y));
  return best;
}

// Distance from point to segment, used to see if a pass lane is open.
function laneClearance(match, from, to, team) {
  const ax = from.x, ay = from.y, bx = to.x, by = to.y;
  const abx = bx - ax, aby = by - ay;
  const len2 = abx * abx + aby * aby || 1;
  let best = Infinity;
  for (const o of match.opponentsOf(team).players) {
    const t = clamp(((o.x - ax) * abx + (o.y - ay) * aby) / len2, 0, 1);
    best = Math.min(best, dist(o.x, o.y, ax + abx * t, ay + aby * t));
  }
  return best;
}

export function choosePassTarget(match, p, pressured) {
  const team = p.team;
  const myFd = depthOf(team, p.y);
  let best = null;
  let bestScore = -Infinity;
  for (const m of team.players) {
    if (m === p) continue;
    const d = dist(p.x, p.y, m.x, m.y);
    if (d < 5 || d > 38) continue;
    const gain = (depthOf(team, m.y) - myFd) * PITCH_L;
    if (gain < -14 && !pressured) continue;
    const lane = laneClearance(match, p, m, team);
    if (lane < 1.4) continue;
    const space = Math.min(nearestOpponentDist(match, m), 10);
    const score = gain * 0.6 + Math.min(lane, 6) * 1.6 + space * 0.9 - d * 0.12 + Math.random() * 3;
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best;
}

// Decision for a computer-controlled ball carrier. Returns an action.
export function decideOnBall(match, p) {
  const team = p.team;
  const params = team.params;
  const gx = PITCH_W / 2;
  const gy = oppGoalY(team);
  const goalDist = dist(p.x, p.y, gx, gy);
  const pressure = nearestOpponentDist(match, p);
  const angleOk = Math.abs(p.x - gx) < goalDist * 0.9;

  if (p.role === 'GK') {
    const target = choosePassTarget(match, p, true);
    return target ? { type: 'pass', target } : { type: 'clear' };
  }
  if (goalDist < params.shootRange && angleOk) {
    const chance = goalDist < 13 ? 0.85 : pressure < 3 ? 0.6 : 0.35;
    if (Math.random() < chance) return { type: 'shoot' };
  }
  if (pressure < 2.6) {
    const target = choosePassTarget(match, p, true);
    if (target && Math.random() < 0.8) return { type: 'pass', target };
    if (depthOf(team, p.y) < 0.2) return { type: 'clear' };
  } else if (Math.random() < 0.18) {
    const target = choosePassTarget(match, p, false);
    if (target && depthOf(team, target.y) > depthOf(team, p.y) + 0.08) return { type: 'pass', target };
  }
  return { type: 'dribble' };
}

// Desired velocity for a dribbling computer player: toward goal, away from pressure.
export function dribbleVelocity(match, p) {
  const team = p.team;
  const gx = PITCH_W / 2 + (Math.random() - 0.5) * 4;
  const gy = oppGoalY(team);
  let [dx, dy] = norm(gx - p.x, gy - p.y);
  let nearest = null;
  let nd = Infinity;
  for (const o of match.opponentsOf(team).players) {
    const d = dist(p.x, p.y, o.x, o.y);
    if (d < nd) { nd = d; nearest = o; }
  }
  if (nearest && nd < 6) {
    const [ax, ay] = norm(p.x - nearest.x, p.y - nearest.y);
    const w = (6 - nd) / 6;
    dx = dx * (1 - w * 0.6) + ax * w * 0.9;
    dy = dy * (1 - w * 0.6) + ay * w * 0.9;
    [dx, dy] = norm(dx, dy);
  }
  // Keep away from touchlines.
  if (p.x < 4) dx += 0.5;
  if (p.x > PITCH_W - 4) dx -= 0.5;
  [dx, dy] = norm(dx, dy);
  const s = runSpeed(p.data.pace) * 0.86 * p.team.params.speed;
  return [dx * s, dy * s];
}

// Off-ball movement for everyone the user is not controlling.
export function offBallVelocity(match, p, chasers) {
  const team = p.team;
  const ball = match.ball;
  const max = runSpeed(p.data.pace) * team.params.speed;

  if (p.role === 'GK') return keeperVelocity(match, p, max);

  if (chasers.has(p)) {
    // Lead the ball a little.
    const tx = ball.x + ball.vx * 0.25;
    const ty = ball.y + ball.vy * 0.25;
    return seek(p, tx, ty, max * 1.12);
  }
  const [tx, ty] = slotTarget(match, p);
  return seek(p, tx, ty, max * 0.8);
}

function keeperVelocity(match, p, max) {
  const team = p.team;
  const ball = match.ball;
  const goalY = ownGoalY(team);
  const inward = -team.dir; // keeper's own goal is behind them
  const ballFd = depthOf(team, ball.y);
  const inBox = ballFd < BOX_D / PITCH_L && Math.abs(ball.x - PITCH_W / 2) < BOX_W / 2;
  // Rush a loose ball in the box if the keeper is the closest player to it.
  if (inBox && !ball.owner && match.closestTo(ball.x, ball.y) === p) {
    return seek(p, ball.x, ball.y, max * 1.1);
  }
  // Dive across the line toward where a shot will cross.
  const step0 = 1.2;
  const lineY = team.dir < 0 ? goalY - step0 : goalY + step0;
  if (!ball.owner && ball.isShot && ball.lastTouch !== team && Math.sign(ball.vy) === Math.sign(goalY - ball.y)) {
    const cx = crossingX(ball.x, ball.y, ball.vx, ball.vy, lineY, SHOT_FRICTION);
    if (cx != null && Math.abs(cx - PITCH_W / 2) < GOAL_W / 2 + 1.5) return seek(p, cx, lineY, max * 2.2);
  }
  const off = clamp((ball.x - PITCH_W / 2) * 0.22, -GOAL_W / 2 + 0.6, GOAL_W / 2 - 0.6);
  const step = ballFd < 0.3 ? 2.2 : 1.2;
  return seek(p, PITCH_W / 2 + off, goalY + inward * -step, max);
}

// Who chases the ball: one presser per team, two when the ball is loose.
export function pickChasers(match, userControlled) {
  const set = new Set();
  const ball = match.ball;
  for (const team of match.teams) {
    const ranked = team.players
      .filter((p) => p.role !== 'GK' && p !== userControlled)
      .map((p) => ({ p, d: dist(p.x, p.y, ball.x, ball.y) }))
      .sort((a, b) => a.d - b.d);
    if (ball.owner && ball.owner.team === team) continue;
    const userIsChasing = userControlled && userControlled.team === team;
    // A second defender closes down a carrier who gets within 30m of goal.
    const danger = ball.owner && depthOf(team, ball.y) < 0.3;
    const count = !ball.owner || danger ? 2 : 1;
    for (let i = 0; i < Math.min(count - (userIsChasing ? 1 : 0), ranked.length); i++) set.add(ranked[i].p);
  }
  return set;
}

export { passSpeed };
