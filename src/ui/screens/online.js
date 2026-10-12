import { h, Button, Card, ScreenHeader } from '../components.js';
import { getPlayer } from '../../data/cloud.js';
import { Room, currentRoom, setCurrentRoom, normalizeCode } from '../../net/room.js';

// PLAY ONLINE: create a room (then pick your team) or join one with a code.
export function onlineScreen({ go, args }) {
  // Leaving the lobby flow lands here; make sure no stale room stays open.
  const stale = currentRoom();
  if (stale) stale.leave();

  const el = h('main', { class: 'screen screen--online' });
  const codeInput = h('input', {
    id: 'room-code', class: 'input numeric room-code-input', type: 'text', inputmode: 'text', maxlength: '4',
    autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', placeholder: 'ABCD', 'aria-describedby': 'join-error',
  });
  const joinError = h('p', { id: 'join-error', class: 'body form-error', role: 'alert' });
  const joinBtn = Button('JOIN ROOM', { type: 'submit' });
  let busy = false;

  codeInput.addEventListener('input', () => { codeInput.value = normalizeCode(codeInput.value); });

  const join = async (e) => {
    if (e) e.preventDefault();
    if (busy) return;
    const code = normalizeCode(codeInput.value);
    if (code.length !== 4) { joinError.textContent = 'Enter the 4-character code your friend shared.'; codeInput.focus(); return; }
    busy = true;
    joinBtn.disabled = true;
    joinError.textContent = 'Joining...';
    try {
      const { name } = await getPlayer();
      const room = await Room.join(code, { name, teamId: null });
      setCurrentRoom(room);
      go('teamSelect', { mode: 'online', blockedId: room.host && room.host.teamId });
    } catch (err) {
      joinError.textContent = err.message;
      busy = false;
      joinBtn.disabled = false;
    }
  };

  el.append(
    ScreenHeader('PLAY ONLINE', () => go('home')),
    h('p', { class: 'body text-muted screen-intro' }, 'Play a friend on another device. One of you creates a room and shares the code.'),
    Card({ class: 'online-card' },
      h('h2', { class: 'title' }, 'CREATE ROOM'),
      h('p', { class: 'body text-muted' }, 'Pick your team, then share the code or invite link.'),
      Button('CREATE ROOM', { variant: 'primary', onClick: () => go('teamSelect', { mode: 'online', creating: true }) })),
    Card({ class: 'online-card' },
      h('h2', { class: 'title' }, 'JOIN ROOM'),
      h('form', { class: 'profile-form', novalidate: true, onSubmit: join },
        h('label', { class: 'label', for: 'room-code' }, 'ROOM CODE'),
        codeInput,
        joinError,
        joinBtn)),
    h('p', { class: 'caption text-muted online-note' }, 'THE ROOM CREATOR’S DEVICE RUNS THE MATCH, SO THEIR CONNECTION MATTERS MOST.'));

  // Arrived from an invite link: fill the code and join straight away.
  getPlayer().then(({ name }) => {
    if (!name) { go('profile', { mode: 'first', next: { screen: 'online', args } }); return; }
    if (args.code) { codeInput.value = normalizeCode(args.code); join(); }
  });

  return { el };
}
