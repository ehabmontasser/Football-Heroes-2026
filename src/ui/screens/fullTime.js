import { h, Button, Card, KitSwatch } from '../components.js';

export function statsTable(summary) {
  const { home, away } = summary;
  const rows = [
    ['POSSESSION', `${home.possessionPct}%`, `${away.possessionPct}%`],
    ['SHOTS', home.shots, away.shots],
    ['ON TARGET', home.onTarget, away.onTarget],
    ['PASSES', home.passes, away.passes],
  ];
  return h('table', { class: 'stats-table' },
    h('thead', {}, h('tr', {},
      h('th', { class: 'label', scope: 'col' }, home.team.code),
      h('th', { class: 'caption text-muted', scope: 'col' }, 'STAT'),
      h('th', { class: 'label', scope: 'col' }, away.team.code))),
    h('tbody', {}, rows.map(([label, a, b]) => h('tr', {},
      h('td', { class: 'numeric' }, a),
      h('th', { class: 'caption text-muted', scope: 'row' }, label),
      h('td', { class: 'numeric' }, b)))));
}

export function fullTimeScreen({ go, state, args }) {
  const s = args.summary;
  if (!s) { queueMicrotask(() => go('home')); return { el: h('main') }; }
  const { home, away, goals } = s;
  const result = home.score > away.score ? 'YOU WIN' : home.score < away.score ? 'YOU LOSE' : 'DRAW';
  const line = home.score > away.score
    ? `${home.team.name} beat ${away.team.name}.`
    : home.score < away.score
      ? `${away.team.name} took this one. Try again or drop the difficulty.`
      : 'Honours even after 90 minutes.';

  const scorers = (side) => goals.filter((g) => g.side === side).map((g) => h('li', { class: 'body' }, `${g.scorer} ${g.minute}`));

  const el = h('main', { class: 'screen screen--fulltime' },
    h('h1', { class: 'display-xl result-title' }, result),
    h('p', { class: 'body text-muted' }, line),
    Card({ class: 'result-card' },
      h('span', { class: 'caption text-muted' }, 'FULL TIME'),
      h('div', { class: 'result-score-row' },
        h('div', { class: 'result-team' }, KitSwatch(home.team, 'lg'), h('span', { class: 'title' }, home.team.code)),
        h('span', { class: 'display-xl result-score' }, `${home.score} - ${away.score}`),
        h('div', { class: 'result-team' }, KitSwatch(away.team, 'lg'), h('span', { class: 'title' }, away.team.code))),
      h('div', { class: 'scorers' },
        h('ul', { class: 'scorers__list' }, scorers('home')),
        h('ul', { class: 'scorers__list scorers__list--away' }, scorers('away')))),
    Card({ class: 'result-card' }, h('h2', { class: 'title' }, 'MATCH STATS'), statsTable(s)),
    h('div', { class: 'result-actions' },
      Button('REMATCH', { variant: 'primary', onClick: () => go('match') }),
      Button('NEW MATCH', { onClick: () => go('teamSelect', { mode: 'pick' }) }),
      Button('MENU', { onClick: () => go('home') })));
  return { el };
}
