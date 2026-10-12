import { h, Button, Card, ScreenHeader, Dialog } from '../components.js';
import { HCAPTCHA_SITE_KEY, cleanName, getPlayer, signIn, setName, setOfflineName, newPlayer } from '../../data/cloud.js';

const HCAPTCHA_SRC = 'https://js.hcaptcha.com/1/api.js?render=explicit&onload=fh26CaptchaReady';
let captchaLoader = null;

function loadCaptcha() {
  if (window.hcaptcha) return Promise.resolve(window.hcaptcha);
  if (!captchaLoader) {
    captchaLoader = new Promise((resolve, reject) => {
      window.fh26CaptchaReady = () => resolve(window.hcaptcha);
      const s = document.createElement('script');
      s.src = HCAPTCHA_SRC;
      s.async = true;
      s.onerror = () => { captchaLoader = null; reject(new Error('hCaptcha failed to load')); };
      document.head.append(s);
    });
  }
  return captchaLoader;
}

// First visit: "ENTER YOUR NAME" (creates the player). Later: rename from home.
export function profileScreen({ go, args }) {
  const first = args.mode !== 'edit';
  const next = () => (args.next ? go(args.next.screen, args.next.args) : go('home'));

  const input = h('input', {
    id: 'player-name', class: 'input body', type: 'text', maxlength: '16', autocomplete: 'nickname',
    autocapitalize: 'words', spellcheck: 'false', placeholder: 'e.g. Captain Ehab', 'aria-describedby': 'name-hint name-error',
  });
  const error = h('p', { id: 'name-error', class: 'body form-error', role: 'alert' });
  const captchaBox = h('div', { class: 'captcha' });
  const submit = Button(first ? 'START' : 'SAVE', { variant: 'primary', type: 'submit' });
  const offline = Button('PLAY WITHOUT SAVING', { onClick: () => playOffline() });

  const form = h('form', { class: 'profile-form', novalidate: true },
    h('label', { class: 'label', for: 'player-name' }, 'PLAYER NAME'),
    input,
    h('p', { id: 'name-hint', class: 'caption text-muted' }, '2 TO 16 CHARACTERS. SHOWN ON YOUR MATCHES.'),
    error,
    captchaBox,
    h('div', { class: 'dialog__actions' }, submit, first ? offline : null));

  // Start over as a different player (only when renaming an existing one).
  const confirmNewPlayer = () => Dialog({
    title: 'NEW PLAYER?',
    body: h('div', { class: 'howto' },
      h('p', { class: 'body text-muted' }, 'You will pick a new name and pass the human check again.'),
      h('p', { class: 'body form-error' }, 'Your current player and its match history can’t be brought back on this device. There is no password to sign back in.')),
    actions: (close) => [
      Button('START AS NEW PLAYER', {
        variant: 'primary',
        onClick: async (e) => {
          e.currentTarget.disabled = true;
          await newPlayer();
          close();
          go('profile', { mode: 'first' });
        },
      }),
      Button('KEEP MY PLAYER', { onClick: close }),
    ],
  });

  const el = h('main', { class: 'screen screen--profile' },
    ScreenHeader(first ? 'ENTER YOUR NAME' : 'YOUR NAME', first ? null : () => go('home')),
    h('p', { class: 'body text-muted screen-intro' }, first
      ? 'Pick the name for your player. No password needed; your matches are saved to this device.'
      : 'Change the name shown on your matches.'),
    Card({ class: 'profile-card' }, form),
    first ? null : Card({ class: 'profile-card' },
      h('h2', { class: 'title' }, 'NEW PLAYER'),
      h('p', { class: 'body text-muted' }, 'Start fresh on this device with a new name and an empty match history.'),
      Button('NEW PLAYER', { onClick: confirmNewPlayer })));

  let needsAccount = false;
  let widgetId = null;
  let token = null;
  let busy = false;

  const showError = (msg) => { error.textContent = msg || ''; };

  getPlayer().then(async (player) => {
    if (player.name) input.value = player.name;
    needsAccount = !player.signedIn;
    if (!needsAccount) return;
    if (!HCAPTCHA_SITE_KEY) {
      captchaBox.append(h('p', { class: 'caption text-muted' }, 'SAVING IS NOT SET UP YET. YOU CAN STILL PLAY.'));
      return;
    }
    try {
      const hc = await loadCaptcha();
      widgetId = hc.render(captchaBox, {
        sitekey: HCAPTCHA_SITE_KEY,
        theme: 'dark',
        callback: (t) => { token = t; showError(''); },
        'expired-callback': () => { token = null; },
        'error-callback': () => { token = null; },
      });
    } catch {
      captchaBox.append(h('p', { class: 'caption text-muted' }, 'THE HUMAN CHECK COULD NOT LOAD. YOU CAN PLAY WITHOUT SAVING.'));
    }
  });

  function validName() {
    const res = cleanName(input.value);
    if (!res.ok) { showError(res.message); input.focus(); return null; }
    return res.name;
  }

  function playOffline() {
    const name = validName();
    if (!name) return;
    setOfflineName(name);
    next();
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy) return;
    const name = validName();
    if (!name) return;
    if (needsAccount && !HCAPTCHA_SITE_KEY) { setOfflineName(name); next(); return; }
    if (needsAccount && !token) { showError('Complete the human check first.'); return; }
    busy = true;
    submit.disabled = true;
    const res = needsAccount ? await signIn(name, token) : await setName(name);
    busy = false;
    submit.disabled = false;
    if (res.ok) { next(); return; }
    showError(res.message);
    token = null;
    if (widgetId != null && window.hcaptcha) window.hcaptcha.reset(widgetId);
  });

  queueMicrotask(() => input.focus());
  return { el };
}
