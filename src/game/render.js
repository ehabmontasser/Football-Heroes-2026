// Canvas renderer. Colors come from design tokens via theme.js.

import {
  PITCH_W, PITCH_L, GOAL_W, GOAL_DEPTH, BOX_W, BOX_D, SIX_W, SIX_D, CENTER_R, clamp, lerp,
} from './physics.js';
import { token, rgba, textOn } from '../theme.js';

const VIEW_METERS = 38; // meters visible across the short side of the screen
const BODY_R = 1.05; // drawn player radius in meters
const BALL_R = 0.45;

export class Renderer {
  constructor(canvas, match) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.match = match;
    this.camX = PITCH_W / 2;
    this.camY = PITCH_L / 2;
    this.flip = false;
    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.w = w;
    this.h = h;
    this.dpr = dpr;
    this.scale = Math.min(w, h) / VIEW_METERS;
  }

  toScreen(x, y) {
    let dx = x - this.camX;
    let dy = y - this.camY;
    if (this.flip) { dx = -dx; dy = -dy; }
    return [this.w / 2 + dx * this.scale, this.h / 2 + dy * this.scale];
  }

  followCamera(dt, snap) {
    const b = this.match.ball;
    const halfW = this.w / 2 / this.scale;
    const halfH = this.h / 2 / this.scale;
    const margin = 4;
    const fitX = (v, half, size) => (half * 2 >= size + margin * 2 ? size / 2 : clamp(v, half - margin, size + margin - half));
    const tx = fitX(b.x, halfW, PITCH_W);
    const ty = fitX(b.y, halfH, PITCH_L);
    const k = snap ? 1 : 1 - Math.exp(-4 * dt);
    this.camX = lerp(this.camX, tx, k);
    this.camY = lerp(this.camY, ty, k);
  }

  draw(dt) {
    const { ctx } = this;
    this.followCamera(dt, false);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.drawPitch();
    const m = this.match;
    const players = [...m.allPlayers].sort((a, b) => (this.flip ? b.y - a.y : a.y - b.y));
    const ballBehind = !m.ball.owner;
    if (ballBehind) this.drawBall();
    for (const p of players) this.drawPlayer(p);
    if (!ballBehind) this.drawBall();
    this.drawControlled();
  }

  drawPitch() {
    const { ctx, scale } = this;
    ctx.fillStyle = token('pitch-green');
    ctx.fillRect(0, 0, this.w, this.h);

    // Mowing stripes: a faint `ink` wash every other band.
    const band = PITCH_L / 14;
    ctx.fillStyle = rgba('ink', 0.035);
    for (let i = 0; i < 14; i += 2) this.rect(0, i * band, PITCH_W, band, true);

    ctx.strokeStyle = rgba('ink', 0.8);
    ctx.lineWidth = Math.max(1.5, 0.12 * scale);
    this.rect(0, 0, PITCH_W, PITCH_L);
    this.line(0, PITCH_L / 2, PITCH_W, PITCH_L / 2);
    this.circle(PITCH_W / 2, PITCH_L / 2, CENTER_R);
    this.dot(PITCH_W / 2, PITCH_L / 2, 0.3);
    for (const top of [true, false]) {
      const y0 = top ? 0 : PITCH_L;
      const s = top ? 1 : -1;
      this.rect(PITCH_W / 2 - BOX_W / 2, top ? 0 : PITCH_L - BOX_D, BOX_W, BOX_D);
      this.rect(PITCH_W / 2 - SIX_W / 2, top ? 0 : PITCH_L - SIX_D, SIX_W, SIX_D);
      this.dot(PITCH_W / 2, y0 + s * 11, 0.3);
      // Penalty arc: the part of the 9.15m circle outside the box.
      const a = Math.acos((BOX_D - 11) / CENTER_R);
      const [cx, cy] = this.toScreen(PITCH_W / 2, y0 + s * 11);
      const base = (top ? Math.PI / 2 : -Math.PI / 2) + (this.flip ? Math.PI : 0);
      ctx.beginPath();
      ctx.arc(cx, cy, CENTER_R * scale, base - a, base + a);
      ctx.stroke();
      // Goal frame and net.
      ctx.save();
      ctx.fillStyle = rgba('ink', 0.18);
      this.rect(PITCH_W / 2 - GOAL_W / 2, top ? -GOAL_DEPTH : PITCH_L, GOAL_W, GOAL_DEPTH, true);
      ctx.restore();
      ctx.save();
      ctx.lineWidth = Math.max(2, 0.2 * scale);
      ctx.strokeStyle = token('ink');
      this.rect(PITCH_W / 2 - GOAL_W / 2, top ? -GOAL_DEPTH : PITCH_L, GOAL_W, GOAL_DEPTH);
      ctx.restore();
    }
  }

  rect(x, y, w, h, fill) {
    const [ax, ay] = this.toScreen(x, y);
    const [bx, by] = this.toScreen(x + w, y + h);
    const rx = Math.min(ax, bx), ry = Math.min(ay, by);
    const rw = Math.abs(bx - ax), rh = Math.abs(by - ay);
    if (fill) this.ctx.fillRect(rx, ry, rw, rh);
    else this.ctx.strokeRect(rx, ry, rw, rh);
  }

  line(x0, y0, x1, y1) {
    const [ax, ay] = this.toScreen(x0, y0);
    const [bx, by] = this.toScreen(x1, y1);
    this.ctx.beginPath();
    this.ctx.moveTo(ax, ay);
    this.ctx.lineTo(bx, by);
    this.ctx.stroke();
  }

  circle(x, y, r) {
    const [cx, cy] = this.toScreen(x, y);
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r * this.scale, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  dot(x, y, r) {
    const [cx, cy] = this.toScreen(x, y);
    this.ctx.save();
    this.ctx.fillStyle = rgba('ink', 0.8);
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, Math.max(2, r * this.scale), 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  drawPlayer(p) {
    const { ctx, scale } = this;
    const [sx, sy] = this.toScreen(p.x, p.y);
    const r = BODY_R * scale;
    const kit = p.team.kit;
    const isGK = p.role === 'GK';
    const fill = isGK ? (p.team.isUser ? 'cyan-energy' : 'sun-amber') : kit;
    const ink = textOn(fill);

    // Facing notch, so you can see where a player will pass.
    const fx = this.flip ? -p.fx : p.fx;
    const fy = this.flip ? -p.fy : p.fy;
    ctx.fillStyle = token(ink);
    ctx.beginPath();
    ctx.moveTo(sx + fx * r * 1.45, sy + fy * r * 1.45);
    ctx.lineTo(sx - fy * r * 0.55 + fx * r * 0.8, sy + fx * r * 0.55 + fy * r * 0.8);
    ctx.lineTo(sx + fy * r * 0.55 + fx * r * 0.8, sy - fx * r * 0.55 + fy * r * 0.8);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fillStyle = token(fill);
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, r * 0.16);
    ctx.strokeStyle = token(ink);
    ctx.stroke();

    ctx.fillStyle = token(ink);
    ctx.font = `700 ${Math.round(r * 1.05)}px ${token('font-display')}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(p.data.number), sx, sy + r * 0.05);

    if (p.stun > 0) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = token('navy-950');
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  drawBall() {
    const { ctx, scale } = this;
    const b = this.match.ball;
    const [sx, sy] = this.toScreen(b.x, b.y);
    const r = Math.max(4, BALL_R * scale);
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fillStyle = token('ink');
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, r * 0.3);
    ctx.strokeStyle = token('navy-950');
    ctx.stroke();
  }

  drawControlled() {
    const p = this.match.controlled;
    if (!p || this.match.phase === 'goal') return;
    const { ctx, scale } = this;
    const [sx, sy] = this.toScreen(p.x, p.y);
    const r = BODY_R * scale;
    // `badge-yellow` ring and marker above the player you control.
    ctx.lineWidth = Math.max(2.5, r * 0.25);
    ctx.strokeStyle = token('badge-yellow');
    ctx.beginPath();
    ctx.arc(sx, sy, r * 1.55, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = token('badge-yellow');
    const top = sy - r * 2.1;
    ctx.beginPath();
    ctx.moveTo(sx, top + r * 0.6);
    ctx.lineTo(sx - r * 0.55, top - r * 0.2);
    ctx.lineTo(sx + r * 0.55, top - r * 0.2);
    ctx.closePath();
    ctx.fill();

    // Shot power bar.
    const charge = this.match.ball.owner === p ? this.match.shotCharge : 0;
    if (charge > 0) {
      const w = r * 4;
      const h = Math.max(5, r * 0.4);
      const x = sx - w / 2;
      const y = sy + r * 1.9;
      ctx.fillStyle = token('navy-950');
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = charge > 0.92 ? token('cta-red') : token('cyan-energy');
      ctx.fillRect(x, y, w * charge, h);
    }
  }
}
