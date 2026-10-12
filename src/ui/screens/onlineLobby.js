import { h, Button, Card, Chip, KitSwatch, ScreenHeader, Dialog } from '../components.js';
import { getTeam } from '../../data/teams.js';
import { currentRoom } from '../../net/room.js';

const DURATIONS = [4, 6, 10, 14, 20];

// Waiting room: shows the code, both players and their teams. The host picks
// the match length and kicks off; the guest follows automatically.
export function onlineLobbyScreen({ go }) {
  const room = currentRoom();
  if (!room) { queueMicrotask(() => go('online')); return { el: h('main') }; }
  const isHost = room.role === 'host';

  const el = h('main', { class: 'screen screen--lobby' });
  const offs = [];
  let copied = false;

  const side = (player, label, isMe) => {
    const team = player && player.teamId ? getTeam(player.teamId) : null;
    return h('div', { class: 'matchup__side' },
      team ? KitSwatch(team, 'lg') : h('span', { class: 'kit-swatch kit-swatch--lg kit-swatch--empty', 'aria-hidden': 'true' }),
      h('span', { class: 'caption text-muted' }, label),
      h('span', { class: 'title' }, team ? team.name : player ? 'Picking team...' : 'Waiting...'),
      h('span', { class: 'body text-muted lobby__name' }, player ? player.name : 'No one yet'),
      isMe ? Button('CHANGE TEAM', { small: true, onClick: () => go('teamSelect', { mode: 'online', blockedId: other() && other().teamId }) }) : null);
  };
  const other = () => (isHost ? room.guest : room.host);

  async function invite() {
    const url = room.inviteUrl();
    const text = `Play me in Football Heroes 2026! Room ${room.code}`;
    try {
      if (navigator.share) { await navigator.share({ title: 'Football Heroes 2026', text, url }); return; }
      await navigator.clipboard.writeText(url);
      copied = true;
      render();
    } catch { /* share sheet dismissed */ }
  }

  function render() {
    const s = room.snapshot();
    const ready = !!(s.host && s.host.teamId && s.guest && s.guest.teamId);
    const status = isHost
      ? (!s.guest ? 'Share the code. Your friend joins from PLAY ONLINE.' : !s.guest.teamId ? `${s.guest.name} is picking a team.` : `${s.guest.name} is ready.`)
      : `Waiting for ${s.host ? s.host.name : 'the host'} to kick off.`;

    el.replaceChildren(
      ScreenHeader('ONLINE MATCH', () => leave()),
      Card({ class: 'room-card' },
        h('span', { class: 'caption text-muted' }, 'ROOM CODE'),
        h('span', { class: 'display-xl room-code', 'aria-label': `Room code ${s.code.split('').join(' ')}` }, s.code),
        isHost ? Button(copied ? 'LINK COPIED' : 'SHARE INVITE LINK', { small: true, onClick: invite }) : null),
      Card({ class: 'matchup' },
        side(s.host, isHost ? 'YOU (HOST)' : 'HOST', isHost),
        h('span', { class: 'display-lg matchup__vs' }, 'VS'),
        side(s.guest, isHost ? 'FRIEND' : 'YOU', !isHost)),
      Card({ class: 'setup-card' },
        h('h2', { class: 'title' }, 'MATCH LENGTH'),
        isHost
          ? h('div', { class: 'chip-row', role: 'group', 'aria-label': 'Match length' },
            DURATIONS.map((d) => Chip(`${d} MIN`, { selected: s.duration === d, onClick: () => room.setDuration(d) })))
          : h('p', { class: 'body text-muted' }, `${s.duration} minutes, chosen by ${s.host ? s.host.name : 'the host'}.`)),
      h('footer', { class: 'action-bar' },
        h('div', { class: 'action-bar__summary' }, h('span', { class: 'body lobby__status', role: 'status' }, status)),
        isHost ? Button('KICK OFF', { variant: 'primary', disabled: !ready, onClick: () => kickOff() }) : null));
  }

  async function kickOff() {
    const s = room.snapshot();
    const setup = {
      homeId: s.host.teamId, awayId: s.guest.teamId, duration: s.duration,
      hostName: s.host.name, guestName: s.guest.name, at: Date.now(),
    };
    await room.send('setup', setup);
    go('match', { online: { role: 'host', ...setup } });
  }

  function leave() {
    room.leave();
    go('online');
  }

  offs.push(room.on('lobby', render));
  offs.push(room.on('setup', (setup) => { if (!isHost) go('match', { online: { role: 'guest', ...setup } }); }));
  offs.push(room.on('left', (who) => {
    if (who.role === 'host') {
      Dialog({ title: 'ROOM CLOSED', body: h('p', { class: 'body text-muted' }, `${who.name} left the room.`), onClose: () => go('online') });
      room.leave();
    }
  }));

  render();
  return { el, destroy: () => offs.forEach((off) => off()) };
}
