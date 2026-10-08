import { h, Button, Card, KitSwatch, Dialog, Glyph } from '../components.js';
import { getTeam } from '../../data/teams.js';
import { Match } from '../../game/engine.js';
import { Renderer } from '../../game/render.js';
import { Input } from '../../game/input.js';
import { resolveKits } from '../../theme.js';
import { howToPlay } from './howToPlay.js';
import { statsTable } from './fullTime.js';

const STEP = 1 / 60;

// Solid white glyphs, one weight, 24px (no icon set yet).
const GLYPHS = {
  pass: '<path d="M3 11h12.2l-4.6-4.6L13 4l8.5 8-8.5 8-2.4-2.4 4.6-4.6H3z" fill="currentColor"/>',
  switch: '<path d="M7 3 2 8l5 5V9.5h9v-3H7zm10 8v3.5H8v3h9V21l5-5z" fill="currentColor"/>',
  shoot: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="12" cy="12" r="4" fill="currentColor"/>',
  tackle: '<path d="M4 18h16v3H4zM5 15l9.5-9.5 3 3L8 18H5z" fill="currentColor"/>',
  sprint: '<path d="M4 5h4l7 7-7 7H4l7-7zm8 0h4l7 7-7 7h-4l7-7z" fill="currentColor"/>',
  pause: '<path d="M6 4h4v16H6zm8 0h4v16h-4z" fill="currentColor"/>',
};
const glyph = (name) => Glyph(GLYPHS[name]);

export function matchScreen({ go, state }) {
  const homeTeam = getTeam(state.homeId);
  const awayTeam = getTeam(state.awayId);
  if (!homeTeam || !awayTeam) { queueMicrotask(() => go('home')); return { el: h('main') }; }

  const duration = state.debugDuration || state.duration;
  const kits = resolveKits(homeTeam, awayTeam);
  const swatch = (team, kit) => KitSwatch({ kit: { primary: kit, secondary: team.kit.secondary } }, 'sm');

  // ---------- DOM ----------
  const canvas = h('canvas', { class: 'match-canvas', 'aria-label': `${homeTeam.name} against ${awayTeam.name}`, role: 'img' });
  const homeScore = h('span', { class: 'numeric scoreboard__score' }, '0');
  const awayScore = h('span', { class: 'numeric scoreboard__score' }, '0');
  const clock = h('span', { class: 'numeric scoreboard__clock' }, "1'");
  const timeLeft = h('span', { class: 'caption text-muted' }, '');
  const pauseBtn = h('button', { class: 'icon-btn icon-btn--hud', type: 'button', 'aria-label': 'Pause' }, glyph('pause'));

  const hud = h('div', { class: 'match-hud' },
    h('div', { class: 'capsule scoreboard', role: 'status', 'aria-live': 'off' },
      swatch(homeTeam, kits.home), h('span', { class: 'label' }, homeTeam.code), homeScore,
      h('span', { class: 'scoreboard__dash numeric', 'aria-hidden': 'true' }, '-'),
      awayScore, h('span', { class: 'label' }, awayTeam.code), swatch(awayTeam, kits.away)),
    h('div', { class: 'capsule match-clock' }, clock, timeLeft),
    pauseBtn);

  const banner = h('div', { class: 'match-banner', 'aria-live': 'polite' });
  const toast = h('div', { class: 'match-toast', 'aria-live': 'polite' });

  const knob = h('div', { class: 'joystick__knob' });
  const joystick = h('div', { class: 'joystick', 'aria-hidden': 'true' }, knob);
  const actionBtn = (cls, name, label) => {
    const lab = h('span', { class: 'caption' }, label);
    const ic = h('span', { class: 'action-btn__icon' }, glyph(name));
    const el = h('button', { class: `action-btn ${cls}`, type: 'button', 'aria-label': label }, ic, lab);
    el.setGlyph = (n, l) => { ic.replaceChildren(glyph(n)); lab.textContent = l; el.setAttribute('aria-label', l); };
    return el;
  };
  const passBtn = actionBtn('action-btn--pass', 'pass', 'PASS');
  const shootBtn = actionBtn('action-btn--shoot', 'shoot', 'SHOOT');
  const sprintBtn = actionBtn('action-btn--sprint', 'sprint', 'SPRINT');
  const controls = h('div', { class: 'controls' }, joystick, h('div', { class: 'action-cluster' }, sprintBtn, passBtn, shootBtn));

  const el = h('main', { class: 'screen screen--match' }, canvas, hud, banner, toast, controls);

  // ---------- game ----------
  let bannerTimer = 0;
  let toastTimer = 0;
  const showBanner = (title, sub, kind = 'gold') => {
    banner.className = `match-banner match-banner--${kind} is-visible`;
    banner.replaceChildren(h('span', { class: 'display-xl' }, title), sub ? h('span', { class: 'label' }, sub) : null);
    bannerTimer = 2.4;
  };
  const showToast = (text) => {
    toast.replaceChildren(h('span', { class: 'label' }, text));
    toast.classList.add('is-visible');
    toastTimer = 1.4;
  };

  let pendingFulltime = 0;
  const match = new Match({
    home: homeTeam, away: awayTeam, kits, duration, difficulty: state.difficulty,
    onEvent(type, data) {
      if (type === 'goal') {
        homeScore.textContent = match.home.score;
        awayScore.textContent = match.away.score;
        showBanner('GOAL!', `${data.minute} ${data.scorer.toUpperCase()} · ${data.teamCode}`);
      } else if (type === 'restart') {
        if (data.kind !== 'kickoff') showToast(data.label);
      } else if (type === 'save') {
        showToast('SAVED');
      } else if (type === 'stoppage') {
        showToast(`+${data.minutes} MIN ADDED`);
      } else if (type === 'halftime') {
        openHalfTime();
      } else if (type === 'fulltime') {
        showBanner('FULL TIME', `${homeTeam.code} ${match.home.score} - ${match.away.score} ${awayTeam.code}`, 'navy');
        pendingFulltime = 2.2;
      }
    },
  });

  let renderer;
  let input;
  let paused = false;
  let overlay = null;
  let raf = 0;
  let last = performance.now();
  let acc = 0;
  let lastHasBall = null;
  let lastClock = '';
  let lastLeft = '';

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!paused) {
      acc += dt;
      while (acc >= STEP) {
        const snap = input.snapshot();
        if (renderer.flip) {
          snap.move = [-snap.move[0], -snap.move[1]];
        }
        match.update(STEP, snap);
        acc -= STEP;
      }
      if (bannerTimer > 0 && (bannerTimer -= dt) <= 0) banner.classList.remove('is-visible');
      if (toastTimer > 0 && (toastTimer -= dt) <= 0) toast.classList.remove('is-visible');
      if (pendingFulltime > 0 && (pendingFulltime -= dt) <= 0) {
        go('fullTime', { summary: match.summary() });
        return;
      }
    }
    renderer.flip = match.home.dir > 0; // you always attack up the screen
    renderer.draw(paused ? 0 : dt);
    updateHud();
  }

  function updateHud() {
    const c = match.clockLabel();
    if (c !== lastClock) { clock.textContent = c; lastClock = c; }
    const s = Math.ceil(match.realSecondsLeft());
    const left = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} LEFT`;
    if (left !== lastLeft) { timeLeft.textContent = left; lastLeft = left; }
    const hasBall = !!match.controlled && match.ball.owner === match.controlled;
    if (hasBall !== lastHasBall) {
      lastHasBall = hasBall;
      passBtn.setGlyph(hasBall ? 'pass' : 'switch', hasBall ? 'PASS' : 'SWITCH');
      shootBtn.setGlyph(hasBall ? 'shoot' : 'tackle', hasBall ? 'SHOOT' : 'TACKLE');
    }
  }

  // ---------- overlays ----------
  function closeOverlay() {
    if (overlay) overlay.remove();
    overlay = null;
  }

  function pause() {
    if (paused || match.phase === 'halftime' || match.phase === 'fulltime') return;
    paused = true;
    input.reset();
    overlay = h('div', { class: 'overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Paused' },
      Card({ class: 'dialog' },
        h('h2', { class: 'display-lg' }, 'PAUSED'),
        h('p', { class: 'body text-muted' }, `${homeTeam.name} ${match.home.score} - ${match.away.score} ${awayTeam.name}, ${match.clockLabel()}`),
        h('div', { class: 'dialog__actions' },
          Button('RESUME', { variant: 'primary', onClick: resume }),
          Button('HOW TO PLAY', { onClick: () => Dialog({ title: 'HOW TO PLAY', body: howToPlay() }) }),
          Button('QUIT MATCH', { onClick: () => go('home') }))));
    el.append(overlay);
    overlay.querySelector('button').focus();
  }

  function resume() {
    closeOverlay();
    paused = false;
    last = performance.now();
  }

  function openHalfTime() {
    paused = true;
    input.reset();
    overlay = h('div', { class: 'overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Half time' },
      Card({ class: 'dialog' },
        h('h2', { class: 'display-lg' }, 'HALF TIME'),
        h('p', { class: 'display-xl result-score' }, `${match.home.score} - ${match.away.score}`),
        statsTable(match.summary()),
        h('div', { class: 'dialog__actions' },
          Button('SECOND HALF', {
            variant: 'primary',
            onClick: () => {
              closeOverlay();
              match.startSecondHalf();
              renderer.flip = match.home.dir > 0;
              renderer.followCamera(0, true);
              paused = false;
              last = performance.now();
            },
          }))));
    el.append(overlay);
    overlay.querySelector('button').focus();
  }

  pauseBtn.addEventListener('click', pause);
  const onKey = (e) => {
    const k = e.key.toLowerCase();
    if (k === 'p' || k === 'escape') {
      if (paused && overlay && match.phase !== 'halftime') resume();
      else pause();
    }
  };
  const onVisibility = () => { if (document.hidden) pause(); };
  const onResize = () => renderer && renderer.resize();

  // Start once the canvas is in the DOM and has a size.
  requestAnimationFrame(() => {
    renderer = new Renderer(canvas, match);
    renderer.followCamera(0, true);
    input = new Input({ joystick, knob, passBtn, shootBtn, sprintBtn });
    window.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('resize', onResize);
    showBanner('KICK OFF', `${homeTeam.name.toUpperCase()} VS ${awayTeam.name.toUpperCase()}`, 'navy');
    last = performance.now();
    raf = requestAnimationFrame(frame);
  });

  // Debug hook for automated checks.
  window.__fh = { match };

  return {
    el,
    destroy() {
      cancelAnimationFrame(raf);
      input && input.destroy();
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', onResize);
      delete window.__fh;
    },
  };
}
