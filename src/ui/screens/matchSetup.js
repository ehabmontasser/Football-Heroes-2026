import { h, Button, Card, Chip, KitSwatch, ScreenHeader } from '../components.js';
import { getTeam } from '../../data/teams.js';

const DURATIONS = [4, 6, 10, 14, 20];
const DIFFICULTIES = [
  { id: 'easy', label: 'EASY', hint: 'Slower opponents who miss more.' },
  { id: 'normal', label: 'NORMAL', hint: 'A fair contest. Ratings decide a lot.' },
  { id: 'hard', label: 'HARD', hint: 'Sharp, quick opponents and a strong keeper.' },
];

export function matchSetupScreen({ go, state }) {
  const home = getTeam(state.homeId);
  const away = getTeam(state.awayId);
  if (!home || !away) { queueMicrotask(() => go('teamSelect', { mode: 'pick' })); return { el: h('main') }; }

  const el = h('main', { class: 'screen screen--setup' });

  const side = (team, label) => h('div', { class: 'matchup__side' },
    KitSwatch(team, 'lg'),
    h('span', { class: 'caption text-muted' }, label),
    h('span', { class: 'title' }, team.name),
    h('span', { class: 'numeric' }, team.rating));

  function render() {
    const diff = DIFFICULTIES.find((d) => d.id === state.difficulty);
    el.replaceChildren(
      ScreenHeader('MATCH SETUP', () => go('teamSelect', { mode: 'pick', step: 'away' })),
      Card({ class: 'matchup' }, side(home, 'YOU'), h('span', { class: 'display-lg matchup__vs' }, 'VS'), side(away, 'CPU')),
      Card({ class: 'setup-card' },
        h('h2', { class: 'title' }, 'MATCH LENGTH'),
        h('p', { class: 'body text-muted' }, `Real-time minutes for the full 90. Each half lasts ${state.duration / 2} min.`),
        h('div', { class: 'chip-row', role: 'group', 'aria-label': 'Match length' },
          DURATIONS.map((d) => Chip(`${d} MIN`, { selected: state.duration === d, onClick: () => { state.duration = d; render(); } })))),
      Card({ class: 'setup-card' },
        h('h2', { class: 'title' }, 'DIFFICULTY'),
        h('p', { class: 'body text-muted' }, diff.hint),
        h('div', { class: 'chip-row', role: 'group', 'aria-label': 'Difficulty' },
          DIFFICULTIES.map((d) => Chip(d.label, { selected: state.difficulty === d.id, onClick: () => { state.difficulty = d.id; render(); } })))),
      h('footer', { class: 'action-bar' },
        h('div', { class: 'action-bar__summary' },
          h('span', { class: 'label' }, `${state.duration} MIN · ${diff.label}`)),
        Button('KICK OFF', { variant: 'primary', onClick: () => go('match') })));
  }

  render();
  return { el };
}
