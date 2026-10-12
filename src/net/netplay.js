// Wire format between host and guest.
//   Host -> guest 'state' (~15/s): clock, phase, score, ball and all 22 players.
//   Guest -> host 'input' (~15/s and on every button press): stick + button counters.
// Button presses travel as running counters, so a quick tap between two
// messages is never lost: the host replays any presses it has not seen yet.

import { getTeam } from '../data/teams.js';

export const SEND_INTERVAL_MS = 66;

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
    this.dirty = false;
  }

  // Feed one local input snapshot (already in world coordinates).
  update(snap, now) {
    if (snap.passPressed) { this.counts.pn += 1; this.dirty = true; }
    if (snap.shootPressed) { this.counts.dn += 1; this.dirty = true; }
    if (snap.shootReleased) { this.counts.un += 1; this.dirty = true; }
    this.move = snap.move;
    this.sprint = snap.sprint;
    if (this.dirty || now - this.lastSent >= SEND_INTERVAL_MS) {
      this.lastSent = now;
      this.dirty = false;
      this.room.send('input', { m: [r2(this.move[0]), r2(this.move[1])], sp: this.sprint, ...this.counts });
    }
  }
}

// Applies host state to a local Match used only for drawing. Positions glide
// toward the latest snapshot so 15 updates a second still look smooth.
export class StateMirror {
  constructor(match) {
    this.match = match;
    this.target = null;
    this.lastHeard = performance.now();
  }

  receive(msg) {
    const m = this.match;
    this.target = msg;
    this.lastHeard = performance.now();
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

  // Called every frame on the guest.
  tick(dt) {
    const t = this.target;
    if (!t) return;
    const m = this.match;
    const k = 1 - Math.exp(-14 * dt);
    m.allPlayers.forEach((p, i) => {
      const j = i * 5;
      const [x, y, fx, fy, stun] = t.p.slice(j, j + 5);
      // Snap on big jumps (kickoff resets) instead of sliding across the pitch.
      if (Math.abs(x - p.x) > 8 || Math.abs(y - p.y) > 8) { p.x = x; p.y = y; }
      else { p.x += (x - p.x) * k; p.y += (y - p.y) * k; }
      p.fx = fx; p.fy = fy;
      p.stun = stun ? 0.1 : 0;
    });
    const b = m.ball;
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
