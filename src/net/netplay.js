// Wire format between host and guest.
//   Host -> guest 'state' (~30/s): clock, phase, score, ball and all 22 players.
//   Guest -> host 'input' (on every button press, up to ~30/s while the stick
//   moves, a few times a second when idle): stick + button counters.
// The guest also moves its own player locally the moment the stick moves
// (prediction) and eases it toward the host's version, so running feels instant.
// Button presses travel as running counters, so a quick tap between two
// messages is never lost: the host replays any presses it has not seen yet.

import { getTeam } from '../data/teams.js';
import { PITCH_W, PITCH_L, clamp, runSpeed, steer } from '../game/physics.js';

export const SEND_INTERVAL_MS = 33;
const IDLE_HEARTBEAT_MS = 200;

const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;

// ---------- host side ----------

export function encodeState(match) {
  const idx = (p) => (p ? match.allPlayers.indexOf(p) : -1);
  const players = [];
  for (const p of match.allPlayers) players.push(r1(p.x), r1(p.y), r2(p.fx), r2(p.fy), p.stun > 0 ? 1 : 0);
  return {
    c: r2(match.clock),
    h: match.half,
    ph: match.phase,
    s: [match.home.score, match.away.score],
    d: match.home.dir,
    st: match.stoppage,
    b: [r1(match.ball.x), r1(match.ball.y)],
    o: idx(match.ball.owner),
    k: [idx(match.home.controlled), idx(match.away.controlled)],
    p: players,
  };
}

// Turns the guest's latest message into one input snapshot per simulation step.
export class RemoteInput {
  constructor() {
    this.latest = { m: [0, 0], sp: false, pn: 0, dn: 0, un: 0 };
    this.seen = { pn: 0, dn: 0, un: 0 };
    this.down = false;
    this.lastHeard = performance.now();
  }

  receive(msg) {
    this.latest = msg;
    this.lastHeard = performance.now();
  }

  snapshot() {
    const g = this.latest;
    const snap = { move: g.m || [0, 0], sprint: !!g.sp, passPressed: false, shootDown: false, shootPressed: false, shootReleased: false };
    if (g.pn > this.seen.pn) { snap.passPressed = true; this.seen.pn += 1; }
    if (!this.down && g.dn > this.seen.dn) {
      this.down = true; this.seen.dn += 1; snap.shootPressed = true;
    } else if (this.down && g.un > this.seen.un) {
      this.down = false; this.seen.un += 1; snap.shootReleased = true;
    }
    snap.shootDown = this.down;
    return snap;
  }
}

// ---------- guest side ----------

export class InputSender {
  constructor(room) {
    this.room = room;
    this.counts = { pn: 0, dn: 0, un: 0 };
    this.move = [0, 0];
    this.sprint = false;
    this.lastSent = 0;
    this.sentMove = [0, 0];
    this.sentSprint = false;
    this.dirty = false;
  }

  // Feed one local input snapshot (already in world coordinates).
  update(snap, now) {
    if (snap.passPressed) { this.counts.pn += 1; this.dirty = true; }
    if (snap.shootPressed) { this.counts.dn += 1; this.dirty = true; }
    if (snap.shootReleased) { this.counts.un += 1; this.dirty = true; }
    this.move = snap.move;
    this.sprint = snap.sprint;
    const since = now - this.lastSent;
    const moved = Math.abs(this.move[0] - this.sentMove[0]) + Math.abs(this.move[1] - this.sentMove[1]) > 0.05
      || this.sprint !== this.sentSprint;
    // Buttons go out at once; stick changes at up to ~30/s; otherwise a heartbeat.
    if (this.dirty || (moved && since >= SEND_INTERVAL_MS) || since >= IDLE_HEARTBEAT_MS) {
      this.lastSent = now;
      this.dirty = false;
      this.sentMove = [r2(this.move[0]), r2(this.move[1])];
      this.sentSprint = this.sprint;
      this.room.send('input', { m: this.sentMove, sp: this.sprint, ...this.counts });
    }
  }
}

// Applies host state to a local Match used only for drawing. Other players glide
// toward the latest snapshot; your own player is predicted locally.
export class StateMirror {
  constructor(match) {
    this.match = match;
    this.target = null;
    this.prev = null;
    this.prevAt = 0;
    this.at = 0;
    this.lastHeard = performance.now();
    this.predicted = null; // the player being predicted right now
  }

  receive(msg) {
    const m = this.match;
    const now = performance.now();
    this.prev = this.target;
    this.prevAt = this.at;
    this.target = msg;
    this.at = now;
    this.lastHeard = now;
    m.clock = msg.c;
    m.half = msg.h;
    m.phase = msg.ph;
    m.home.score = msg.s[0];
    m.away.score = msg.s[1];
    m.stoppage = msg.st;
    if (m.home.dir !== msg.d) {
      m.home.dir = msg.d;
      m.away.dir = -msg.d;
    }
    const at = (i) => (i >= 0 ? m.allPlayers[i] : null);
    m.ball.owner = at(msg.o);
    m.home.controlled = at(msg.k[0]);
    m.away.controlled = at(msg.k[1]);
  }

  // Host's position and velocity for player i, from the last two snapshots.
  serverOf(i) {
    const j = i * 5;
    const t = this.target.p;
    let vx = 0, vy = 0;
    const span = (this.at - this.prevAt) / 1000;
    if (this.prev && span > 0.005 && span < 0.5) {
      vx = (t[j] - this.prev.p[j]) / span;
      vy = (t[j + 1] - this.prev.p[j + 1]) / span;
    }
    return { x: t[j], y: t[j + 1], vx, vy };
  }

  // Move your own player straight away using the same rules as the engine,
  // then ease it toward where the host will have it by now.
  predict(p, dt, snap, rttSec) {
    const m = this.match;
    const i = m.allPlayers.indexOf(p);
    const srv = this.serverOf(i);
    if (this.predicted !== p) {
      this.predicted = p;
      p.x = srv.x; p.y = srv.y; p.vx = srv.vx; p.vy = srv.vy;
    }
    const owner = m.ball.owner === p;
    const lockedForRestart = owner && (m.phase === 'kickoff' || m.phase === 'restart');
    if (p.stun > 0 || lockedForRestart || m.phase === 'goal') {
      steer(p, 0, 0, dt);
    } else {
      let s = runSpeed(p.data.pace) * p.team.params.speed * (snap.sprint ? 1.22 : 0.95);
      if (owner) s *= 0.9;
      steer(p, snap.move[0] * s, snap.move[1] * s, dt);
    }
    // Where the host's copy should be once our latest input reaches it.
    const lead = clamp(rttSec / 2 + SEND_INTERVAL_MS / 1000, 0, 0.35);
    const ex = srv.x + srv.vx * lead - p.x;
    const ey = srv.y + srv.vy * lead - p.y;
    if (Math.hypot(ex, ey) > 4) { p.x += ex; p.y += ey; } // a tackle or reset: jump
    else {
      const k = 1 - Math.exp(-3 * dt);
      p.x += ex * k; p.y += ey * k;
    }
    p.x = clamp(p.x, -2, PITCH_W + 2);
    p.y = clamp(p.y, -2, PITCH_L + 2);
  }

  // Called every frame on the guest. `own` is the guest's controlled player.
  tick(dt, own = null, snap = null, rttSec = 0.15) {
    const t = this.target;
    if (!t) return;
    const m = this.match;
    const k = 1 - Math.exp(-22 * dt);
    if (!own) this.predicted = null;
    m.allPlayers.forEach((p, i) => {
      if (p === own && snap) { this.predict(p, dt, snap, rttSec); p.stun = t.p[i * 5 + 4] ? 0.1 : 0; return; }
      const j = i * 5;
      const [x, y, fx, fy, stun] = t.p.slice(j, j + 5);
      // Snap on big jumps (kickoff resets) instead of sliding across the pitch.
      if (Math.abs(x - p.x) > 8 || Math.abs(y - p.y) > 8) { p.x = x; p.y = y; }
      else { p.x += (x - p.x) * k; p.y += (y - p.y) * k; }
      p.fx = fx; p.fy = fy;
      p.stun = stun ? 0.1 : 0;
    });
    const b = m.ball;
    if (own && snap && b.owner === own) {
      // Your ball sits at your (predicted) feet, like in the engine.
      b.x = own.x + own.fx * 0.8;
      b.y = own.y + own.fy * 0.8;
      return;
    }
    const [bx, by] = t.b;
    if (Math.abs(bx - b.x) > 8 || Math.abs(by - b.y) > 8) { b.x = bx; b.y = by; }
    else { b.x += (bx - b.x) * Math.min(1, k * 1.4); b.y += (by - b.y) * Math.min(1, k * 1.4); }
  }
}

// ---------- summaries ----------

const stripTeam = ({ team, ...rest }) => ({ ...rest, teamId: team.id });

export const encodeSummary = (s) => ({ home: stripTeam(s.home), away: stripTeam(s.away), goals: s.goals });

export function decodeSummary(s) {
  const side = ({ teamId, ...rest }) => ({ ...rest, team: getTeam(teamId) });
  return { home: side(s.home), away: side(s.away), goals: s.goals };
}

// Re-centre a summary on the guest so "home" is always the person viewing it.
export function flipSummary(s) {
  return {
    home: s.away,
    away: s.home,
    goals: s.goals.map((g) => ({ ...g, side: g.side === 'home' ? 'away' : 'home' })),
  };
}
