// Match simulation: clock, halves, restarts, possession, goals and stats.
// Physics runs in real time; only the match clock is compressed so 90 minutes
// fit in the duration the player picked.

import {
  PITCH_W, PITCH_L, GOAL_X0, GOAL_X1, GOAL_W, CONTROL_R,
  BALL_FRICTION, SHOT_FRICTION, clamp, dist, norm, runSpeed, steer, separate, crossingX, passSpeed,
} from './physics.js';
import {
  DIFFICULTY, depthOf, oppGoalY, kickoffTarget, decideOnBall, dribbleVelocity,
  offBallVelocity, pickChasers, choosePassTarget,
} from './ai.js';

const HALF = 45;

function makeTeam(data, side, dir, params, isUser, kit) {
  const team = {
    side, data, dir, params, isUser, kit,
    score: 0,
    stats: { possession: 0, shots: 0, onTarget: 0, passes: 0 },
    players: [],
  };
  const starters = data.squad.filter((p) => p.starter);
  const ratingBoost = 1 + (data.rating - 80) / 200;
  team.params = { ...params, speed: params.speed * ratingBoost };
  team.players = starters.map((d, i) => ({
    id: d.id, data: d, team, slot: i, role: d.pos,
    x: 0, y: 0, vx: 0, vy: 0, fx: 0, fy: -dir,
    stun: 0, kickCd: 0, tackleCd: 0, decide: 0, hold: 0, locked: false, savedKick: -1, triedKick: -1,
  }));
  return team;
}

export class Match {
  constructor({ home, away, kits, duration, difficulty, onEvent }) {
    this.durationMin = duration;
    this.minutesPerSecond = 90 / (duration * 60);
    this.onEvent = onEvent || (() => {});
    this.home = makeTeam(home, 'home', -1, DIFFICULTY.normal, true, kits.home);
    this.away = makeTeam(away, 'away', 1, DIFFICULTY[difficulty], false, kits.away);
    this.teams = [this.home, this.away];
    this.allPlayers = [...this.home.players, ...this.away.players];
    this.ball = { x: PITCH_W / 2, y: PITCH_L / 2, vx: 0, vy: 0, owner: null, lastTouch: null, lastKicker: null, kickId: 0, passTarget: null };
    this.clock = 0;
    this.half = 1;
    this.stoppage = [1 + Math.floor(Math.random() * 3), 2 + Math.floor(Math.random() * 4)];
    this.stoppageAnnounced = false;
    this.goals = [];
    this.phase = 'kickoff';
    this.phaseTimer = 0;
    this.restart = null;
    this.controlled = null;
    this.lastSwitch = 0;
    this.shootHeld = 0;
    this.time = 0;
    this.setupKickoff(this.home, true);
  }

  // ---------- queries ----------
  opponentsOf(team) { return team === this.home ? this.away : this.home; }
  possessionTeam() { return this.ball.owner ? this.ball.owner.team : this.ball.lastTouch; }
  closestTo(x, y, list = this.allPlayers) {
    let best = null, bd = Infinity;
    for (const p of list) {
      const d = dist(p.x, p.y, x, y);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }
  get shotCharge() { return clamp(this.shootHeld / 0.8, 0, 1); }

  clockLabel() {
    const base = this.half === 1 ? HALF : 90;
    if (this.clock >= base) return `${base}+${Math.floor(this.clock - base) + 1}'`;
    return `${Math.floor(this.clock) + 1}'`;
  }

  realSecondsLeft() {
    const end1 = HALF + this.stoppage[0];
    const end2 = 90 + this.stoppage[1];
    const left = this.half === 1 ? (end1 - this.clock) + (end2 - HALF) : end2 - this.clock;
    return Math.max(0, left / this.minutesPerSecond);
  }

  // ---------- set pieces ----------
  setupKickoff(team, snap) {
    for (const p of this.allPlayers) {
      const [x, y] = kickoffTarget(p, team);
      if (snap) { p.x = x; p.y = y; p.vx = 0; p.vy = 0; }
      p.fx = 0; p.fy = p.team.dir; p.stun = 0; p.locked = false;
    }
    const taker = team.players.find((p) => p.role === 'FW');
    taker.x = PITCH_W / 2;
    taker.y = PITCH_L / 2 - team.dir * 0.8;
    this.startRestart('kickoff', team, taker, PITCH_W / 2, PITCH_L / 2);
  }

  startRestart(kind, team, taker, x, y) {
    const b = this.ball;
    b.x = x; b.y = y; b.vx = 0; b.vy = 0;
    b.passTarget = null;
    if (!taker) {
      const pool = kind === 'goalkick' ? team.players.filter((p) => p.role === 'GK') : team.players.filter((p) => p.role !== 'GK');
      taker = this.closestTo(x, y, pool);
    }
    taker.vx = 0; taker.vy = 0; taker.locked = true;
    // Face the taker toward the pitch.
    const [fx, fy] = norm(PITCH_W / 2 - x, PITCH_L / 2 - y);
    taker.fx = kind === 'kickoff' ? 0 : fx;
    taker.fy = kind === 'kickoff' ? team.dir : fy;
    // Stand just behind the ball so it sits on the spot.
    taker.x = x - taker.fx * 0.8;
    taker.y = y - taker.fy * 0.8;
    b.owner = taker;
    b.lastTouch = team;
    this.phase = kind === 'kickoff' ? 'kickoff' : 'restart';
    this.restart = { kind, team, taker, timer: 0 };
    if (team.isUser) this.controlled = taker.role === 'GK' ? null : taker;
    const labels = { kickoff: 'KICK OFF', throwin: 'THROW-IN', corner: 'CORNER', goalkick: 'GOAL KICK' };
    this.onEvent('restart', { kind, label: labels[kind], team });
  }

  // ---------- ball actions ----------
  kick(p, vx, vy, opts = {}) {
    const b = this.ball;
    b.owner = null;
    b.x = p.x + p.fx * 0.9;
    b.y = p.y + p.fy * 0.9;
    b.vx = vx; b.vy = vy;
    b.lastTouch = p.team;
    b.lastKicker = p;
    b.kickId += 1;
    b.passTarget = opts.target || null;
    b.isShot = !!opts.shot;
    p.kickCd = 0.35;
    p.locked = false;
    if (this.phase === 'kickoff' || this.phase === 'restart') {
      this.phase = 'play';
      this.restart = null;
    }
  }

  pass(p, target, error) {
    const lead = 0.35;
    const tx = target.x + target.vx * lead;
    const ty = target.y + target.vy * lead;
    const d = dist(p.x, p.y, tx, ty);
    const err = (error * (1.3 - p.data.passing / 100) * d) / 20;
    const ex = tx + (Math.random() - 0.5) * 2 * err;
    const ey = ty + (Math.random() - 0.5) * 2 * err;
    const [nx, ny] = norm(ex - p.x, ey - p.y);
    p.fx = nx; p.fy = ny;
    const s = passSpeed(d);
    p.team.stats.passes += 1;
    this.kick(p, nx * s, ny * s, { target });
  }

  passInDirection(p, dx, dy) {
    // Pick the teammate best lined up with the requested direction.
    const [ux, uy] = norm(dx, dy);
    let best = null, bestScore = -Infinity;
    for (const m of p.team.players) {
      if (m === p) continue;
      const d = dist(p.x, p.y, m.x, m.y);
      if (d < 3 || d > 45) continue;
      const [mx, my] = norm(m.x - p.x, m.y - p.y);
      const align = mx * ux + my * uy;
      if (align < 0.55) continue;
      const score = align * 30 - d * 0.35;
      if (score > bestScore) { bestScore = score; best = m; }
    }
    if (best) return this.pass(p, best, DIFFICULTY.normal.passError * 0.8);
    // Nobody there: knock it into space.
    p.fx = ux; p.fy = uy;
    p.team.stats.passes += 1;
    this.kick(p, ux * 15, uy * 15);
  }

  shoot(p, power, aim) {
    const team = p.team;
    const gy = oppGoalY(team);
    const side = aim != null ? aim : (Math.random() < 0.5 ? -1 : 1) * (0.45 + Math.random() * 0.4);
    const gx = PITCH_W / 2 + side * (GOAL_W / 2 - 0.4);
    const d = dist(p.x, p.y, gx, gy);
    const params = team.params;
    let err = params.shotError * (1.6 - p.data.shooting / 100) * (0.5 + d / 22);
    if (power > 0.92) err += 1.8; // over-hit
    const ex = gx + (Math.random() - 0.5) * 2 * err;
    const [nx, ny] = norm(ex - p.x, gy - p.y);
    const speed = 17 + power * 14;
    p.fx = nx; p.fy = ny;
    team.stats.shots += 1;
    const cx = crossingX(p.x, p.y, nx * speed, ny * speed, gy, SHOT_FRICTION);
    if (cx != null && cx > GOAL_X0 && cx < GOAL_X1) team.stats.onTarget += 1;
    this.kick(p, nx * speed, ny * speed, { shot: true });
    this.ball.shotDist = d;
  }

  clear(p) {
    const team = p.team;
    const tx = PITCH_W / 2 + (Math.random() - 0.5) * PITCH_W * 0.8;
    const ty = p.y + team.dir * 40;
    const [nx, ny] = norm(tx - p.x, ty - p.y);
    p.fx = nx; p.fy = ny;
    this.kick(p, nx * 25, ny * 25);
  }

  steal(tackler) {
    const prev = this.ball.owner;
    if (prev) prev.stun = 0.7;
    this.ball.owner = tackler;
    this.ball.lastTouch = tackler.team;
    this.ball.passTarget = null;
    tackler.decide = 0.25;
    this.onPossession(tackler);
  }

  onPossession(p) {
    // Track the last player to touch the ball, for goal credit.
    this.ball.lastKicker = p;
    this.ball.isShot = false;
    p.hold = p.role === 'GK' ? 1.1 : 0;
    if (p.role === 'GK') { p.fx = 0; p.fy = p.team.dir; }
    if (p.team.isUser) this.shootHeld = 0;
    p.decide = Math.max(p.decide, 0.15);
    if (p.team.isUser && p.role !== 'GK') this.controlled = p;
  }

  // ---------- user input ----------
  applyUser(input, dt) {
    const team = this.home;
    const ball = this.ball;
    const userHasBall = ball.owner && ball.owner.team === team && ball.owner.role !== 'GK';
    if (userHasBall) this.controlled = ball.owner;

    // Auto-switch to the teammate nearest the ball when defending.
    const outfield = team.players.filter((p) => p.role !== 'GK');
    if (!userHasBall) {
      const target = ball.passTarget && ball.passTarget.team === team ? ball.passTarget : null;
      if (target && target.role !== 'GK') {
        this.controlled = target;
      } else {
        const nearest = this.closestTo(ball.x, ball.y, outfield);
        const cur = this.controlled;
        const curD = cur ? dist(cur.x, cur.y, ball.x, ball.y) : Infinity;
        const nd = dist(nearest.x, nearest.y, ball.x, ball.y);
        if (!cur || (curD - nd > 7 && this.time - this.lastSwitch > 1.2)) this.controlled = nearest;
      }
    }

    const p = this.controlled;
    if (!p) return;

    if (input.passPressed) {
      if (ball.owner === p) {
        const [mx, my] = input.move;
        const dx = Math.hypot(mx, my) > 0.2 ? mx : p.fx;
        const dy = Math.hypot(mx, my) > 0.2 ? my : p.fy;
        this.passInDirection(p, dx, dy);
      } else if (!userHasBall) {
        const others = outfield.filter((o) => o !== p);
        this.controlled = this.closestTo(ball.x, ball.y, others);
        this.lastSwitch = this.time;
      }
    }

    if (ball.owner === p) {
      if (input.shootDown) this.shootHeld += dt;
      if (input.shootReleased) {
        const aim = Math.abs(input.move[0]) > 0.25 ? clamp(input.move[0], -1, 1) : null;
        this.shoot(p, Math.max(0.25, this.shotCharge), aim);
        this.shootHeld = 0;
      }
    } else {
      this.shootHeld = 0;
      if (input.shootPressed && p.tackleCd <= 0 && ball.owner && ball.owner.team !== team && ball.owner.role !== 'GK' && !ball.owner.locked) {
        const o = ball.owner;
        p.tackleCd = 0.6;
        if (dist(p.x, p.y, o.x, o.y) < 2.8) {
          const skill = (o.data.pace + o.data.passing) / 2;
          const chance = clamp(0.55 + (p.data.defending - skill) / 60, 0.25, 0.88);
          if (Math.random() < chance) this.steal(p);
          else p.stun = 0.45;
        } else {
          p.stun = 0.3; // whiffed lunge
        }
      }
    }

    // Movement.
    if (p.locked || p.stun > 0) {
      steer(p, 0, 0, dt);
      return;
    }
    const [mx, my] = input.move;
    let s = runSpeed(p.data.pace) * team.params.speed * (input.sprint ? 1.22 : 0.95);
    if (ball.owner === p) s *= 0.9;
    steer(p, mx * s, my * s, dt);
  }

  // ---------- main update ----------
  update(dt, input) {
    if (this.phase === 'halftime' || this.phase === 'fulltime') return;
    this.time += dt;
    this.clock += dt * this.minutesPerSecond;
    this.phaseTimer += dt;

    const end = this.half === 1 ? HALF : 90;
    if (!this.stoppageAnnounced && this.clock >= end) {
      this.stoppageAnnounced = true;
      this.onEvent('stoppage', { minutes: this.stoppage[this.half - 1] });
    }
    if (this.phase !== 'goal' && this.clock >= end + this.stoppage[this.half - 1]) {
      if (this.half === 1) {
        this.phase = 'halftime';
        this.onEvent('halftime', {});
      } else {
        this.phase = 'fulltime';
        this.onEvent('fulltime', {});
      }
      return;
    }

    for (const p of this.allPlayers) {
      p.stun = Math.max(0, p.stun - dt);
      p.kickCd = Math.max(0, p.kickCd - dt);
      p.tackleCd = Math.max(0, p.tackleCd - dt);
    }

    if (this.phase === 'goal') {
      this.updateGoalCelebration(dt);
      return;
    }

    this.applyUser(input, dt);
    this.updateAI(dt);
    this.updateRestart(dt, input);
    separate(this.allPlayers);
    for (const p of this.allPlayers) {
      p.x = clamp(p.x, -2, PITCH_W + 2);
      p.y = clamp(p.y, -2, PITCH_L + 2);
    }
    this.updateBall(dt);
    if (this.phase === 'play') {
      this.updatePossessionChanges(dt);
      this.checkOut();
    }
    const pt = this.possessionTeam();
    if (pt && this.phase === 'play') pt.stats.possession += dt;
  }

  updateAI(dt) {
    const ball = this.ball;
    const user = this.controlled;
    const chasers = pickChasers(this, user);
    const inSetPiece = this.phase !== 'play';
    for (const p of this.allPlayers) {
      if (p === user && p.role !== 'GK') continue;
      if (p.locked) { steer(p, 0, 0, dt); continue; }
      if (p.stun > 0) { steer(p, p.vx * 0.3, p.vy * 0.3, dt); continue; }

      if (ball.owner === p) {
        if (p.hold > 0) { p.hold -= dt; steer(p, 0, 0, dt); continue; }
        p.decide -= dt;
        if (p.decide <= 0) {
          p.decide = p.team.params.react + Math.random() * 0.25;
          const action = decideOnBall(this, p);
          if (action.type === 'pass') { this.pass(p, action.target, p.team.params.passError); continue; }
          if (action.type === 'shoot') { this.shoot(p, 0.4 + Math.random() * 0.4); continue; }
          if (action.type === 'clear') { this.clear(p); continue; }
        }
        const [vx, vy] = dribbleVelocity(this, p);
        steer(p, vx, vy, dt);
        continue;
      }

      let [vx, vy] = offBallVelocity(this, p, inSetPiece ? new Set() : chasers);
      // Keep 6m away from a set piece being taken by the other team.
      if (inSetPiece && this.restart && this.restart.team !== p.team) {
        const d = dist(p.x, p.y, ball.x, ball.y);
        if (d < 6) {
          const [ax, ay] = norm(p.x - ball.x, p.y - ball.y);
          vx += ax * 5; vy += ay * 5;
        }
      }
      steer(p, vx, vy, dt);
    }
  }

  updateRestart(dt, input) {
    if (this.phase !== 'kickoff' && this.phase !== 'restart') return;
    const r = this.restart;
    r.timer += dt;
    const t = r.taker;
    const userTaking = r.team.isUser && t === this.controlled;
    // The user's pass button is handled in applyUser; auto-play after a pause.
    if (userTaking && r.timer < 5) return;
    if (!userTaking && r.timer < 1.1) return;
    if (this.ball.owner !== t) return;
    let target = null;
    if (r.kind === 'kickoff') {
      target = t.team.players.filter((p) => p !== t && p.role === 'MF').sort((a, b) => dist(a.x, a.y, t.x, t.y) - dist(b.x, b.y, t.x, t.y))[0];
    } else if (r.kind === 'corner') {
      target = t.team.players
        .filter((p) => p !== t && p.role !== 'GK')
        .sort((a, b) => depthOf(t.team, b.y) - depthOf(t.team, a.y))[Math.floor(Math.random() * 3)];
    } else {
      target = choosePassTarget(this, t, true);
    }
    if (target) this.pass(t, target, t.team.params.passError);
    else this.clear(t);
  }

  updateBall(dt) {
    const b = this.ball;
    if (b.owner) {
      const o = b.owner;
      if (o.role === 'GK') {
        // A keeper holds the ball in front of them, never behind the line.
        o.fx = 0; o.fy = o.team.dir;
        o.y = clamp(o.y, 0.6, PITCH_L - 0.6);
      }
      b.x = o.x + o.fx * 0.8;
      b.y = o.y + o.fy * 0.8;
      b.vx = o.vx; b.vy = o.vy;
      return;
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    const decay = Math.exp(-(b.isShot ? SHOT_FRICTION : BALL_FRICTION) * dt);
    b.vx *= decay; b.vy *= decay;
    if (Math.hypot(b.vx, b.vy) < 0.15) { b.vx = 0; b.vy = 0; }
  }

  updatePossessionChanges(dt) {
    const b = this.ball;
    const speed = Math.hypot(b.vx, b.vy);

    if (!b.owner) {
      // Keepers first: saves and catches.
      for (const team of this.teams) {
        const gk = team.players.find((p) => p.role === 'GK');
        const reach = 1.4 + ((gk.data.overall + (team.isUser ? 0 : team.params.gk)) / 100) * 1.4;
        if (gk.kickCd > 0 || gk.savedKick === b.kickId) continue;
        if (dist(gk.x, gk.y, b.x, b.y) > reach) continue;
        if (depthOf(team, b.y) > 0.25) continue; // only near their own goal
        gk.savedKick = b.kickId;
        const rating = gk.data.overall + (team.isUser ? 0 : team.params.gk);
        const range = b.isShot ? b.shotDist || 15 : 15;
        const chance = b.lastTouch === team ? 1 : clamp(0.7 + (rating - 75) / 50 - (speed - 22) / 40 + (range - 12) / 35, 0.3, 0.94);
        if (Math.random() < chance) {
          if (speed > 24 && b.lastTouch !== team) {
            // Parry wide.
            b.vx = (b.x < PITCH_W / 2 ? -1 : 1) * (6 + Math.random() * 6);
            b.vy = -b.vy * 0.25;
            b.lastTouch = team;
            b.lastKicker = gk;
            b.kickId += 1;
            b.passTarget = null;
            gk.kickCd = 0.4;
            this.onEvent('save', { team });
          } else {
            const wasShot = b.isShot;
            b.owner = gk;
            b.lastTouch = team;
            b.vx = 0; b.vy = 0;
            b.passTarget = null;
            this.onPossession(gk);
            if (speed > 12 && wasShot) this.onEvent('save', { team });
          }
          return;
        }
      }

      // Outfield players take a loose ball.
      let best = null, bd = Infinity;
      for (const p of this.allPlayers) {
        if (p.kickCd > 0 || p.stun > 0) continue;
        if (b.isShot && p.role === 'GK' && b.lastTouch !== p.team) continue; // keepers use the save roll
        const d = dist(p.x, p.y, b.x, b.y);
        if (d > CONTROL_R || d >= bd) continue;
        if (speed > 19) {
          // Fast balls can only be cut out occasionally.
          if (p.triedKick === b.kickId) continue;
          p.triedKick = b.kickId;
          if (Math.random() > 0.3) continue;
        }
        bd = d; best = p;
      }
      if (best) {
        b.owner = best;
        b.lastTouch = best.team;
        b.passTarget = null;
        b.vx = 0; b.vy = 0;
        this.onPossession(best);
      }
      return;
    }

    // Ball carried: computer tacklers pressure the carrier.
    const o = b.owner;
    if (o.role === 'GK' || o.locked) return;
    const skill = (o.data.pace + o.data.passing) / 2;
    for (const p of this.opponentsOf(o.team).players) {
      if (p.stun > 0 || p.tackleCd > 0) continue;
      const d = dist(p.x, p.y, o.x, o.y);
      if (d > 2.3) continue;
      const isUser = p === this.controlled;
      const base = isUser ? 0.35 : p.team.params.tackle;
      const rate = base * clamp(0.9 + (p.data.defending - skill) / 70, 0.4, 1.6);
      if (Math.random() < rate * dt) {
        this.steal(p);
        return;
      }
    }
  }

  checkOut() {
    const b = this.ball;
    const last = b.lastTouch || this.home;
    if (b.x < 0 || b.x > PITCH_W) {
      const team = this.opponentsOf(last);
      this.startRestart('throwin', team, null, clamp(b.x, 0.4, PITCH_W - 0.4), clamp(b.y, 1, PITCH_L - 1));
      return;
    }
    if (b.y < 0 || b.y > PITCH_L) {
      const topEnd = b.y < 0;
      // The team defending this end.
      const defending = this.teams.find((t) => (topEnd ? t.dir > 0 : t.dir < 0));
      const attacking = this.opponentsOf(defending);
      if (b.x > GOAL_X0 && b.x < GOAL_X1) {
        this.scoreGoal(attacking);
        return;
      }
      const lineY = topEnd ? 0 : PITCH_L;
      if (last === attacking) {
        const gy = topEnd ? 5.5 : PITCH_L - 5.5;
        this.startRestart('goalkick', defending, null, PITCH_W / 2 + (b.x < PITCH_W / 2 ? -5 : 5), gy);
      } else {
        const cx = b.x < PITCH_W / 2 ? 0.4 : PITCH_W - 0.4;
        this.startRestart('corner', attacking, null, cx, topEnd ? 0.4 : lineY - 0.4);
      }
    }
  }

  scoreGoal(team) {
    team.score += 1;
    const kicker = this.ball.lastKicker;
    const ownGoal = kicker && kicker.team !== team;
    const goal = {
      side: team.side,
      teamCode: team.data.code,
      scorer: kicker ? kicker.data.short + (ownGoal ? ' (OG)' : '') : 'Unknown',
      minute: this.clockLabel(),
    };
    this.goals.push(goal);
    this.ball.owner = null;
    this.ball.vx *= 0.2; this.ball.vy *= 0.2;
    this.phase = 'goal';
    this.phaseTimer = 0;
    this.concededBy = this.opponentsOf(team);
    this.controlled = null;
    this.onEvent('goal', goal);
  }

  updateGoalCelebration(dt) {
    const b = this.ball;
    b.x += b.vx * dt; b.y += b.vy * dt;
    b.vx *= 0.9; b.vy *= 0.9;
    for (const p of this.allPlayers) {
      const [tx, ty] = kickoffTarget(p, this.concededBy);
      const [nx, ny] = norm(tx - p.x, ty - p.y);
      const d = dist(p.x, p.y, tx, ty);
      const s = Math.min(5, d * 2);
      steer(p, nx * s, ny * s, dt);
    }
    if (this.phaseTimer > 2.8) this.setupKickoff(this.concededBy, true);
  }

  startSecondHalf() {
    this.half = 2;
    this.clock = HALF;
    this.stoppageAnnounced = false;
    for (const t of this.teams) t.dir *= -1;
    this.setupKickoff(this.away, true);
  }

  summary() {
    const total = this.home.stats.possession + this.away.stats.possession || 1;
    const pct = Math.round((this.home.stats.possession / total) * 100);
    return {
      home: { ...this.home.stats, possessionPct: pct, score: this.home.score, team: this.home.data },
      away: { ...this.away.stats, possessionPct: 100 - pct, score: this.away.score, team: this.away.data },
      goals: [...this.goals],
    };
  }
}
