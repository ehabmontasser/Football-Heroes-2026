import { h, Button, Card, KitSwatch, ScreenHeader } from '../components.js';
import { getTeam } from '../../data/teams.js';
import { listMatches } from '../../data/cloud.js';

const DATE_FMT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

const outcome = (m) => (m.home_score > m.away_score ? 'win' : m.home_score < m.away_score ? 'loss' : 'draw');
const OUTCOME_LABEL = { win: 'WIN', draw: 'DRAW', loss: 'LOSS' };

export function historyScreen({ go }) {
  const body = h('div', { class: 'history', 'aria-live': 'polite' },
    h('p', { class: 'body text-muted' }, 'Loading your matches...'));
  const el = h('main', { class: 'screen screen--history' },
    ScreenHeader('MATCH HISTORY', () => go('home')),
    body);

  let alive = true;
  listMatches().then(({ ok, reason, matches }) => {
    if (!alive) return;
    if (reason === 'signed-out') {
      body.replaceChildren(Card({}, h('h2', { class: 'title' }, 'SAVING IS OFF'),
        h('p', { class: 'body text-muted' }, 'You are playing without saving. Set up your player to keep a history of your matches.'),
        Button('SET UP PLAYER', { onClick: () => go('profile', { mode: 'edit' }) })));
      return;
    }
    if (!ok) {
      body.replaceChildren(Card({}, h('h2', { class: 'title' }, 'OFFLINE'),
        h('p', { class: 'body text-muted' }, 'Your match history could not be loaded. Check your connection and try again.')));
      return;
    }
    if (!matches.length) {
      body.replaceChildren(Card({}, h('h2', { class: 'title' }, 'NO MATCHES YET'),
        h('p', { class: 'body text-muted' }, 'Finish a quick match and it will show up here.')));
      return;
    }
    body.replaceChildren(summary(matches), h('ol', { class: 'history__list' }, matches.map(row)));
  });

  return { el, destroy: () => { alive = false; } };
}

function summary(matches) {
  const count = (o) => matches.filter((m) => outcome(m) === o).length;
  const goals = matches.reduce((s, m) => s + m.home_score, 0);
  const stat = (label, value) => h('div', { class: 'stat' },
    h('span', { class: 'numeric' }, value), h('span', { class: 'caption text-muted' }, label));
  return Card({ class: 'history__summary' },
    h('div', { class: 'stat-row' },
      stat('PLAYED', matches.length), stat('WON', count('win')), stat('DRAWN', count('draw')),
      stat('LOST', count('loss')), stat('GOALS', goals)));
}

function row(m) {
  const home = getTeam(m.home_team);
  const away = getTeam(m.away_team);
  const o = outcome(m);
  const side = (team, code) => h('span', { class: 'history__team' },
    team ? KitSwatch(team, 'sm') : null, h('span', { class: 'label' }, team ? team.code : code.toUpperCase()));
  const yours = (m.goals || []).filter((g) => g.side === 'home').map((g) => `${g.scorer} ${g.minute}`);
  return h('li', {},
    Card({ class: 'history__row' },
      h('div', { class: 'history__meta' },
        h('span', { class: 'caption text-muted' }, DATE_FMT.format(new Date(m.played_at)).toUpperCase()),
        h('span', { class: `caption outcome outcome--${o}` }, OUTCOME_LABEL[o])),
      h('div', { class: 'history__score' },
        side(home, m.home_team),
        h('span', { class: 'numeric' }, `${m.home_score} - ${m.away_score}`),
        side(away, m.away_team)),
      h('p', { class: 'caption text-muted' }, m.difficulty === 'online'
        ? `${Number(m.duration_min)} MIN · ONLINE VS ${(m.opponent_name || 'A FRIEND').toUpperCase()}`
        : `${Number(m.duration_min)} MIN · ${m.difficulty.toUpperCase()}`),
      yours.length ? h('p', { class: 'body text-muted' }, `Your goals: ${yours.join(', ')}`) : null));
}
