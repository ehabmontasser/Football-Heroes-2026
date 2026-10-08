import { h, Card, Badge, KitSwatch, ScreenHeader } from '../components.js';
import { getTeam } from '../../data/teams.js';
import { FORMATION } from '../../game/ai.js';
import { textOn } from '../../theme.js';

export function squadScreen({ go, args }) {
  const team = getTeam(args.teamId);
  const back = () => (args.back ? go(args.back.screen, args.back.args) : go('home'));
  const starters = team.squad.filter((p) => p.starter);
  const bench = team.squad.filter((p) => !p.starter);
  const avg = (key) => Math.round(starters.reduce((s, p) => s + p[key], 0) / starters.length);

  // Formation board: own goal at the bottom.
  const board = h('div', { class: 'formation', role: 'img', 'aria-label': `${team.name} starting eleven in a 4-4-2` },
    starters.map((p, i) => {
      const slot = FORMATION[i];
      return h('div', { class: 'formation__player', style: { left: `${slot.fx * 100}%`, top: `${(1 - (slot.fd * 1.2 + 0.08)) * 100}%` } },
        h('span', {
          class: 'formation__dot numeric',
          style: { background: `var(--${team.kit.primary})`, color: `var(--${textOn(team.kit.primary)})` },
        }, p.number),
        h('span', { class: 'caption formation__name' }, p.short.toUpperCase()));
    }));

  const row = (p) => h('tr', {},
    h('td', { class: 'numeric' }, p.number),
    h('td', { class: 'caption text-muted' }, p.pos),
    h('th', { class: 'body', scope: 'row' }, p.name),
    h('td', { class: 'numeric squad-table__ovr' }, p.overall));

  const table = (title, players) => Card({ class: 'squad-card' },
    h('h2', { class: 'title' }, title),
    h('table', { class: 'squad-table' },
      h('thead', {}, h('tr', {},
        h('th', { class: 'caption', scope: 'col' }, 'NO'),
        h('th', { class: 'caption', scope: 'col' }, 'POS'),
        h('th', { class: 'caption', scope: 'col' }, 'PLAYER'),
        h('th', { class: 'caption', scope: 'col' }, 'OVR'))),
      h('tbody', {}, players.map(row))));

  const stat = (label, value) => h('div', { class: 'stat' },
    h('span', { class: 'numeric' }, value), h('span', { class: 'caption text-muted' }, label));

  const el = h('main', { class: 'screen screen--squad' },
    ScreenHeader(team.name.toUpperCase(), back),
    Card({ class: 'squad-hero' },
      h('div', { class: 'squad-hero__id' },
        KitSwatch(team, 'lg'),
        h('div', {},
          h('p', { class: 'body text-muted' }, `2026 World Cup: ${team.finish}`),
          team.top16 ? Badge('TOP 16') : null)),
      h('div', { class: 'stat-row' },
        stat('TEAM', team.rating), stat('PACE', avg('pace')), stat('SHOOT', avg('shooting')),
        stat('PASS', avg('passing')), stat('DEFEND', avg('defending')))),
    h('div', { class: 'squad-layout' },
      Card({ class: 'squad-card' }, h('h2', { class: 'title' }, 'STARTING XI 4-4-2'), board),
      h('div', { class: 'squad-tables' }, table('STARTERS', starters), table('BENCH', bench))),
    h('p', { class: 'caption text-muted squad-note' }, 'Player names are fictional.'));
  return { el };
}
