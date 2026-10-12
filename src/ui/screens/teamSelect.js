import { h, Button, Chip, Badge, KitSwatch, ScreenHeader } from '../components.js';
import { TEAMS, getTeam } from '../../data/teams.js';
import { getPlayer } from '../../data/cloud.js';
import { Room, currentRoom, setCurrentRoom } from '../../net/room.js';

const FILTERS = [
  { id: 'all', label: 'ALL 32', test: () => true },
  { id: 'top16', label: 'TOP 16', test: (t) => t.top16 },
  { id: 'r32', label: 'ROUND OF 32', test: (t) => !t.top16 },
];

export function teamSelectScreen({ go, state, args }) {
  const browse = args.mode === 'browse';
  // Online: pick only your own team. `creating` = no room yet (host), otherwise
  // the pick updates the room you are in. `blockedId` is the opponent's team.
  const online = args.mode === 'online';
  const room = online ? currentRoom() : null;
  let onlinePick = args.pick || (room && room.me.teamId) || null;
  let onlineError = '';
  let step = args.step || 'home'; // 'home' = pick your team, 'away' = pick opponent
  let filter = args.filter || 'all';

  const el = h('main', { class: 'screen screen--teams' });

  const selectedId = () => (online ? onlinePick : step === 'home' ? state.homeId : state.awayId);

  async function confirmOnline() {
    onlineError = '';
    try {
      if (args.creating) {
        const { name } = await getPlayer();
        setCurrentRoom(await Room.create({ name, teamId: onlinePick }));
      } else {
        if (!room || room.closed) throw new Error('The room has closed.');
        await room.setTeam(onlinePick);
      }
      go('onlineLobby');
    } catch (err) {
      onlineError = err.message;
      render();
    }
  }

  function render() {
    const title = browse ? 'TEAMS' : step === 'home' ? 'PICK YOUR TEAM' : 'PICK OPPONENT';
    const onBack = () => {
      if (online) { go(room && room.me.teamId ? 'onlineLobby' : 'online'); return; }
      if (!browse && step === 'away') { step = 'home'; render(); return; }
      go('home');
    };
    const intro = online
      ? (args.blockedId ? `Your opponent plays as ${getTeam(args.blockedId).name}. Choose any other nation.` : 'Choose the nation you will play as online.')
      : browse
      ? 'The 32 nations of the 2026 World Cup Round of 32. Tap a team to see its squad.'
      : step === 'home'
        ? 'Choose the nation you will control.'
        : `You play as ${getTeam(state.homeId).name}. Now choose who you face.`;

    const grid = h('div', { class: 'team-grid' },
      TEAMS.filter(FILTERS.find((f) => f.id === filter).test).map((team) => teamTile(team)));

    const children = [
      ScreenHeader(title, onBack),
      h('p', { class: 'body text-muted screen-intro' }, intro),
      h('div', { class: 'chip-row', role: 'group', 'aria-label': 'Filter teams' },
        FILTERS.map((f) => Chip(f.label, { selected: f.id === filter, onClick: () => { filter = f.id; render(); } }))),
      grid,
    ];

    if (online) {
      const sel = onlinePick ? getTeam(onlinePick) : null;
      children.push(h('footer', { class: 'action-bar' },
        h('div', { class: 'action-bar__summary' },
          sel ? KitSwatch(sel, 'sm') : null,
          h('span', { class: onlineError ? 'body form-error' : 'label', role: onlineError ? 'alert' : null },
            onlineError || (sel ? sel.name.toUpperCase() : 'NO TEAM SELECTED'))),
        Button(args.creating ? 'CREATE ROOM' : 'CONTINUE', {
          variant: 'primary',
          disabled: !sel,
          onClick: (e) => { e.currentTarget.disabled = true; confirmOnline(); },
        })));
    } else if (!browse) {
      const sel = selectedId() ? getTeam(selectedId()) : null;
      children.push(h('footer', { class: 'action-bar' },
        h('div', { class: 'action-bar__summary' },
          sel ? KitSwatch(sel, 'sm') : null,
          h('span', { class: 'label' }, sel ? sel.name.toUpperCase() : 'NO TEAM SELECTED')),
        Button(step === 'home' ? 'NEXT' : 'CONTINUE', {
          variant: 'primary',
          disabled: !sel,
          onClick: () => {
            if (step === 'home') { step = 'away'; filter = 'all'; render(); window.scrollTo(0, 0); }
            else go('matchSetup');
          },
        })));
    }
    el.replaceChildren(...children);
  }

  function teamTile(team) {
    const isUserTeam = online ? team.id === args.blockedId : !browse && step === 'away' && team.id === state.homeId;
    const selected = !browse && selectedId() === team.id;
    const openSquad = () => go('squad', { teamId: team.id, back: { screen: 'teamSelect', args: { ...args, step, filter, pick: onlinePick } } });
    const choose = () => {
      if (browse) return openSquad();
      if (online) { onlinePick = team.id; render(); return; }
      if (step === 'home') {
        state.homeId = team.id;
        if (state.awayId === team.id) state.awayId = null;
      } else state.awayId = team.id;
      render();
    };
    return h('article', { class: `card team-tile${selected ? ' is-selected' : ''}${isUserTeam ? ' is-disabled' : ''}` },
      h('button', {
        class: 'team-tile__main', type: 'button', disabled: isUserTeam,
        'aria-pressed': browse ? null : String(selected),
        'aria-label': `${team.name}, rating ${team.rating}, ${team.finish}`,
        onClick: choose,
      },
        h('div', { class: 'team-tile__top' },
          KitSwatch(team),
          h('span', { class: 'numeric team-tile__rating' }, team.rating)),
        h('span', { class: 'title team-tile__name' }, team.name),
        h('span', { class: 'body text-muted team-tile__finish' }, team.finish),
        h('div', { class: 'team-tile__badges' },
          team.top16 ? Badge('TOP 16') : null,
          isUserTeam ? h('span', { class: 'caption text-muted' }, online ? 'OPPONENT' : 'YOUR TEAM') : null,
          selected ? h('span', { class: 'caption tag-selected' }, 'SELECTED') : null)),
      browse ? null : h('button', { class: 'team-tile__squad label', type: 'button', onClick: openSquad, 'aria-label': `View ${team.name} squad` }, 'SQUAD'));
  }

  render();
  return { el };
}
