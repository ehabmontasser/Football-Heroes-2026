import { h, Button, Card, KitSwatch, Dialog, Glyph } from '../components.js';
import { getTeam } from '../../data/teams.js';
import { Match } from '../../game/engine.js';
import { Renderer } from '../../game/render.js';
import { Input } from '../../game/input.js';
import { clamp } from '../../game/physics.js';
import { resolveKits } from '../../theme.js';
import { getPlayer } from '../../data/cloud.js';
import { currentRoom } from '../../net/room.js';
import {
  SEND_INTERVAL_MS, encodeState, RemoteInput, InputSender, StateMirror, encodeSummary, decodeSummary, flipSummary,
} from '../../net/netplay.js';
import { howToPlay } from './howToPlay.js';
import { statsTable } from './fullTime.js';

const STEP = 1 / 60;
const HOST_SILENCE_MS = 3000; // guest shows "waiting for host" after this
const LOST_MS = 15000; // either side gives up after this

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

// Modes: 'solo' (you vs computer), 'host' (runs the online match), 'guest'
// (mirrors the host's match and sends controls).
export function matchScreen({ go, state, args }) {
  const online = args.online || null;
  const mode = online ? online.role : 'solo';
  const room = online ? currentRoom() : null;
  const homeTeam = getTeam(online ? online.homeId : state.homeId);
  const awayTeam = getTeam(online ? online.awayId : state.awayId);
  if (!homeTeam || !awayTeam || (online && !room)) { queueMicrotask(() => go(online ? 'online' : 'home')); return { el: h('main') }; }

  const duration = online ? online.duration : state.debugDuration || state.duration;
  const localSide = mode === 'guest' ? 'away' : 'home';
  const oppName = online ? (mode === 'host' ? online.guestName : online.hostName) : '';
  const kits = resolveKits(homeTeam, awayTeam);
  const swatch = (team, kit) => KitSwatch({ kit: { primary: kit, secondary: team.kit.secondary } }, 'sm');
  const localTeamData = localSide === 'home' ? homeTeam : awayTeam;

  // ---------- DOM ----------
  const canvas = h('canvas', { class: 'match-canvas', 'aria-label': `${homeTeam.name} against ${awayTeam.name}`, role: 'img' });
  const homeScore = h('span', { class: 'numeric scoreboard__score' }, '0');
  const awayScore = h('span', { class: 'numeric scoreboard__score' }, '0');
  const clock = h('span', { class: 'numeric scoreboard__clock' }, "1'");
  const timeLeft = h('span', { class: 'caption text-muted' }, '');
  // Online: round-trip delay to the other player, refreshed every 2 seconds.
  const pingText = h('span', { class: 'caption ping', title: 'Delay to your opponent', hidden: true }, '');
  const pauseBtn = h('button', { class: 'icon-btn icon-btn--hud', type: 'button', 'aria-label': online ? 'Menu' : 'Pause' }, glyph('pause'));

  const hud = h('div', { class: 'match-hud' },
    h('div', { class: 'capsule scoreboard', role: 'status', 'aria-live': 'off' },
      swatch(homeTeam, kits.home), h('span', { class: 'label' }, homeTeam.code), homeScore,
      h('span', { class: 'scoreboard__dash numeric', 'aria-hidden': 'true' }, '-'),
      awayScore, h('span', { class: 'label' }, awayTeam.code), swatch(awayTeam, kits.away)),
    h('div', { class: 'capsule match-clock' }, clock, timeLeft, pingText),
    pauseBtn);

  // Your name: in the HUD next to the clock, and above your player on the pitch.
  const nameCapsule = h('div', { class: 'capsule match-player', hidden: true },
    swatch(localTeamData, kits[localSide]), h('span', { class: 'label match-player__name' }, ''));
  hud.insertBefore(nameCapsule, hud.children[1]);
  let playerName = '';
  getPlayer().then(({ name }) => {
    if (!name) return;
    playerName = name;
    nameCapsule.querySelector('.match-player__name').textContent = name;
    nameCapsule.hidden = false;
    if (renderer) renderer.playerName = name;
  });

  const banner = h('div', { class: 'match-banner', 'aria-live': 'polite' });
  const toast = h('div', { class: 'match-toast', 'aria-live': 'polite' });

  const knob = h('div', { class: 'joystick__knob' });
  const joystick = h('div', { class: 'joystick', 'aria-hidden': 'true' }, knob);
  const actionBtn = (cls, name, label) => {
    const lab = h('span', { class: 'caption' }, label);
    const ic = h('span', { class: 'action-btn__icon' }, glyph(name));
    const btn = h('button', { class: `action-btn ${cls}`, type: 'button', 'aria-label': label }, ic, lab);
    btn.setGlyph = (n, l) => { ic.replaceChildren(glyph(n)); lab.textContent = l; btn.setAttribute('aria-label', l); };
    return btn;
  };
  const passBtn = actionBtn('action-btn--pass', 'pass', 'PASS');
  const shootBtn = actionBtn('action-btn--shoot', 'shoot', 'SHOOT');
  const sprintBtn = actionBtn('action-btn--sprint', 'sprint', 'SPRINT');
  const controls = h('div', { class: 'controls' }, joystick, h('div', { class: 'action-cluster' }, sprintBtn, passBtn, shootBtn));

  const el = h('main', { class: 'screen screen--match' }, canvas, hud, banner, toast, controls);

  // ---------- banners ----------
  let bannerTimer = 0;
  let toastTimer = 0;
  const showBanner = (title, sub, kind = 'gold') => {
    banner.className = `match-banner match-banner--${kind} is-visible`;
    banner.replaceChildren(h('span', { class: 'display-xl' }, title), sub ? h('span', { class: 'label' }, sub) : null);
    bannerTimer = 2.4;
  };
  const showToast = (text, seconds = 1.4) => {
    toast.replaceChildren(h('span', { class: 'label' }, text));
    toast.classList.add('is-visible');
    toastTimer = seconds;
  };

  // ---------- match events (shared by every mode) ----------
  let fulltimeTimer = 0;
  let finalSummary = null;
  let finished = false;

  function onMatchEvent(type, data) {
    if (type === 'goal') {
      showBanner('GOAL!', `${data.minute} ${data.scorer.toUpperCase()} · ${data.teamCode}`);
    } else if (type === 'restart') {
      if (data.kind !== 'kickoff') showToast(data.label);
    } else if (type === 'save') {
      showToast('SAVED');
    } else if (type === 'stoppage') {
      showToast(`+${data.minutes} MIN ADDED`);
    } else if (type === 'halftime') {
      openHalfTime(data.summary);
    } else if (type === 'secondhalf') {
      closeOverlay();
      renderer.followCamera(0, true);
    } else if (type === 'fulltime') {
      finished = true;
      finalSummary = data.summary;
      const s = data.summary;
      showBanner('FULL TIME', `${homeTeam.code} ${s.home.score} - ${s.away.score} ${awayTeam.code}`, 'navy');
      // A timer (not the frame loop) so this also happens in a background tab.
      fulltimeTimer = setTimeout(finishMatch, 2200);
    }
  }

  // Engine events: handled locally, and forwarded to the guest when hosting.
  function engineEvent(type, data) {
    let payload = data;
    if (type === 'restart') payload = { kind: data.kind, label: data.label };
    if (type === 'save') payload = {};
    if (type === 'halftime' || type === 'fulltime') payload = { summary: match.summary() };
    if (mode === 'host') {
      const wire = type === 'halftime' || type === 'fulltime' ? { summary: encodeSummary(payload.summary) } : payload;
      room.send('event', { type, data: wire });
    }
    onMatchEvent(type, payload);
  }

  const match = new Match({
    home: homeTeam, away: awayTeam, kits, duration,
    difficulty: online ? 'normal' : state.difficulty,
    humans: online ? { home: true, away: true } : { home: true, away: false },
    onEvent: mode === 'guest' ? () => {} : engineEvent,
  });
  const localTeam = match[localSide];

  // ---------- online plumbing ----------
  const offs = [];
  const remote = mode === 'host' ? new RemoteInput() : null;
  const mirror = mode === 'guest' ? new StateMirror(match) : null;
  const sender = mode === 'guest' ? new InputSender(room) : null;
  let lastStateSent = 0;
  let guestCharge = 0;
  let waitingShown = false;
  let rttMs = 150; // assumed until the first measurement
  let pingTimer = 0;

  if (mode === 'host') {
    offs.push(room.on('input', (msg) => remote.receive(msg)));
  }
  if (mode === 'guest') {
    offs.push(room.on('state', (msg) => mirror.receive(msg)));
    offs.push(room.on('event', ({ type, data }) => {
      if (type === 'halftime' || type === 'fulltime') {
        onMatchEvent(type, { summary: decodeSummary(data.summary) });
      } else if (type === 'abandon') {
        opponentLeft();
      } else {
        onMatchEvent(type, data);
      }
    }));
  }
  if (online) {
    offs.push(room.on('left', () => opponentLeft()));
    offs.push(room.on('leave', () => opponentLeft()));
    // Ping: echo the other side's pings; time our own.
    offs.push(room.on('ping', ({ t, from }) => room.send('pong', { t, to: from })));
    offs.push(room.on('pong', ({ t, to }) => {
      if (to !== mode) return;
      const sample = performance.now() - t;
      rttMs = rttMs === 150 && !pingText.textContent ? sample : rttMs * 0.7 + sample * 0.3;
      const ms = Math.round(rttMs);
      pingText.textContent = `${ms} MS`;
      pingText.hidden = false;
      pingText.classList.toggle('ping--slow', ms > 200);
    }));
  }

  function opponentLeft(reason) {
    if (finished || leftShown) return;
    leftShown = true;
    paused = mode === 'host';
    closeOverlay();
    overlay = h('div', { class: 'overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Match ended' },
      Card({ class: 'dialog' },
        h('h2', { class: 'display-lg' }, reason === 'lost' ? 'CONNECTION LOST' : 'OPPONENT LEFT'),
        h('p', { class: 'body text-muted' }, reason === 'lost'
          ? 'The connection to your opponent dropped. This match will not be saved.'
          : `${oppName || 'Your opponent'} left the match. This match will not be saved.`),
        h('div', { class: 'dialog__actions' },
          Button('PLAY ONLINE', { variant: 'primary', onClick: () => go('online') }),
          Button('MENU', { onClick: () => go('home') }))));
    el.append(overlay);
    overlay.querySelector('button').focus();
  }

  // ---------- loop ----------
  let renderer;
  let input;
  let paused = false;
  let overlay = null;
  let leftShown = false;
  let raf = 0;
  let last = performance.now();
  let lastSim = performance.now();
  let acc = 0;
  let lastHasBall = null;
  let lastClock = '';
  let lastLeft = '';
  let lastScore = '';
  let halftimeTimer = 0;

  const flipMove = (snap) => {
    if (renderer.flip) snap.move = [-snap.move[0], -snap.move[1]];
    return snap;
  };

  // Advance the simulation (solo and host). Also called from a timer so a host
  // in a background tab keeps the match moving, if slowly.
  function simulate(now) {
    const dt = Math.min(1, (now - lastSim) / 1000);
    lastSim = now;
    if (paused) return;
    acc += dt;
    while (acc >= STEP) {
      const inputs = { home: flipMove(input.snapshot()) };
      if (mode === 'host') inputs.away = remote.snapshot();
      match.update(STEP, inputs);
      acc -= STEP;
    }
    if (mode === 'host' && now - lastStateSent >= SEND_INTERVAL_MS) {
      lastStateSent = now;
      room.send('state', encodeState(match));
    }
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (mode === 'guest') {
      const snap = flipMove(input.snapshot());
      sender.update(snap, now);
      const mine = localTeam.controlled;
      guestCharge = snap.shootDown && mine && match.ball.owner === mine ? guestCharge + dt : 0;
      mirror.tick(dt, localTeam.controlled, snap, rttMs / 1000);
      const silent = now - mirror.lastHeard;
      if (!finished && match.phase !== 'halftime' && silent > HOST_SILENCE_MS && !waitingShown) {
        waitingShown = true;
        showToast(`WAITING FOR ${(oppName || 'HOST').toUpperCase()}...`, 9999);
      } else if (waitingShown && silent < HOST_SILENCE_MS) {
        waitingShown = false;
        toastTimer = 0.01;
      }
      if (!finished && silent > LOST_MS) opponentLeft('lost');
    } else {
      simulate(now);
      if (mode === 'host' && !finished && match.phase !== 'halftime' && now - remote.lastHeard > LOST_MS) opponentLeft('lost');
    }

    if (bannerTimer > 0 && (bannerTimer -= dt) <= 0) banner.classList.remove('is-visible');
    if (toastTimer > 0 && (toastTimer -= dt) <= 0) toast.classList.remove('is-visible');
    renderer.flip = localTeam.dir > 0; // you always attack up the screen
    renderer.draw(paused ? 0 : dt);
    updateHud();
  }

  function finishMatch() {
    if (mode === 'solo') {
      go('fullTime', { summary: finalSummary, duration, difficulty: state.difficulty });
      return;
    }
    const summary = mode === 'guest' ? flipSummary(finalSummary) : finalSummary;
    go('fullTime', { summary, duration, difficulty: 'online', opponentName: oppName, online: true });
  }

  function updateHud() {
    const c = match.clockLabel();
    if (c !== lastClock) { clock.textContent = c; lastClock = c; }
    const s = Math.ceil(match.realSecondsLeft());
    const left = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} LEFT`;
    if (left !== lastLeft) { timeLeft.textContent = left; lastLeft = left; }
    const score = `${match.home.score}-${match.away.score}`;
    if (score !== lastScore) {
      lastScore = score;
      homeScore.textContent = match.home.score;
      awayScore.textContent = match.away.score;
    }
    const mine = localTeam.controlled;
    const hasBall = !!mine && match.ball.owner === mine;
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
    if (overlay || match.phase === 'halftime' || match.phase === 'fulltime') return;
    input.reset();
    if (online) {
      // Online matches never stop: this is just a menu over the live game.
      overlay = h('div', { class: 'overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Menu' },
        Card({ class: 'dialog' },
          h('h2', { class: 'display-lg' }, 'MENU'),
          h('p', { class: 'body text-muted' }, 'The match keeps playing while this is open.'),
          h('div', { class: 'dialog__actions' },
            Button('BACK TO MATCH', { variant: 'primary', onClick: closeOverlay }),
            Button('HOW TO PLAY', { onClick: () => Dialog({ title: 'HOW TO PLAY', body: howToPlay() }) }),
            Button('LEAVE MATCH', { onClick: leaveOnline }))));
    } else {
      paused = true;
      overlay = h('div', { class: 'overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Paused' },
        Card({ class: 'dialog' },
          h('h2', { class: 'display-lg' }, 'PAUSED'),
          h('p', { class: 'body text-muted' }, `${homeTeam.name} ${match.home.score} - ${match.away.score} ${awayTeam.name}, ${match.clockLabel()}`),
          h('div', { class: 'dialog__actions' },
            Button('RESUME', { variant: 'primary', onClick: resume }),
            Button('HOW TO PLAY', { onClick: () => Dialog({ title: 'HOW TO PLAY', body: howToPlay() }) }),
            Button('QUIT MATCH', { onClick: () => go('home') }))));
    }
    el.append(overlay);
    overlay.querySelector('button').focus();
  }

  function resume() {
    closeOverlay();
    paused = false;
    last = performance.now();
    lastSim = last;
  }

  function leaveOnline() {
    room.send('event', { type: 'abandon', data: {} });
    go('online');
  }

  function startSecondHalf() {
    if (mode === 'guest' || match.phase !== 'halftime') return;
    clearTimeout(halftimeTimer);
    closeOverlay();
    match.startSecondHalf();
    if (mode === 'host') room.send('event', { type: 'secondhalf', data: {} });
    renderer.flip = localTeam.dir > 0;
    renderer.followCamera(0, true);
    paused = false;
    last = performance.now();
    lastSim = last;
  }

  function openHalfTime(summary) {
    input.reset();
    closeOverlay();
    if (mode === 'solo') paused = true;
    const view = mode === 'guest' ? flipSummary(summary) : summary;
    let action;
    if (mode === 'guest') {
      action = h('p', { class: 'body text-muted' }, `Waiting for ${oppName || 'the host'} to start the second half.`);
    } else {
      action = Button('SECOND HALF', { variant: 'primary', onClick: startSecondHalf });
      if (mode === 'host') halftimeTimer = setTimeout(startSecondHalf, 30000); // don't leave the guest waiting forever
    }
    overlay = h('div', { class: 'overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Half time' },
      Card({ class: 'dialog' },
        h('h2', { class: 'display-lg' }, 'HALF TIME'),
        h('p', { class: 'display-xl result-score' }, `${view.home.score} - ${view.away.score}`),
        statsTable(view),
        mode === 'host' ? h('p', { class: 'caption text-muted' }, 'THE SECOND HALF STARTS AUTOMATICALLY IN 30 SECONDS.') : null,
        h('div', { class: 'dialog__actions' }, action)));
    el.append(overlay);
    const btn = overlay.querySelector('button');
    if (btn) btn.focus();
  }

  pauseBtn.addEventListener('click', pause);
  const onKey = (e) => {
    const k = e.key.toLowerCase();
    if (k === 'p' || k === 'escape') {
      if (overlay && match.phase !== 'halftime' && !leftShown) (online ? closeOverlay() : resume());
      else pause();
    }
  };
  const onVisibility = () => { if (document.hidden && !online) pause(); };
  const onResize = () => renderer && renderer.resize();
  let bgTimer = 0;
  let destroyed = false;

  // Start once the canvas is in the DOM (a timeout, not an animation frame, so a
  // match that opens in a background tab still starts).
  setTimeout(() => {
    if (destroyed) return;
    renderer = new Renderer(canvas, match);
    renderer.localTeam = localTeam;
    renderer.playerName = playerName;
    renderer.opponentName = oppName;
    if (mode === 'guest') renderer.getCharge = () => clamp(guestCharge / 0.8, 0, 1);
    renderer.flip = localTeam.dir > 0;
    renderer.followCamera(0, true);
    input = new Input({ joystick, knob, passBtn, shootBtn, sprintBtn });
    window.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('resize', onResize);
    const sub = online
      ? `${(playerName || 'YOU').toUpperCase()} VS ${(oppName || 'FRIEND').toUpperCase()}`
      : `${homeTeam.name.toUpperCase()} VS ${awayTeam.name.toUpperCase()}`;
    showBanner('KICK OFF', sub, 'navy');
    last = performance.now();
    lastSim = last;
    raf = requestAnimationFrame(frame);
    // Background tabs get no animation frames: keep a hosted match ticking and
    // keep the guest's "still here" input flowing so the host doesn't give up.
    if (mode === 'host') bgTimer = setInterval(() => { if (document.hidden) simulate(performance.now()); }, 250);
    if (online) {
      const ping = () => room.send('ping', { t: performance.now(), from: mode });
      ping();
      pingTimer = setInterval(ping, 2000);
    }
    if (mode === 'guest') {
      bgTimer = setInterval(() => {
        if (!document.hidden) return;
        sender.update({ move: [0, 0], sprint: false, passPressed: false, shootPressed: false, shootReleased: false }, performance.now());
      }, 500);
    }
  }, 0);

  // Debug hook for automated checks.
  window.__fh = { match, mode };

  return {
    el,
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      clearTimeout(fulltimeTimer);
      clearTimeout(halftimeTimer);
      clearInterval(bgTimer);
      clearInterval(pingTimer);
      input && input.destroy();
      offs.forEach((off) => off());
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', onResize);
      if (room) room.leave();
      delete window.__fh;
    },
  };
}
