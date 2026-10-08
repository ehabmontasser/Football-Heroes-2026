import { h, Button, Card, Capsule, Dialog } from '../components.js';
import { howToPlay } from './howToPlay.js';

export function homeScreen({ go, state }) {
  const play = () => {
    state.homeId = null;
    state.awayId = null;
    go('teamSelect', { mode: 'pick' });
  };

  const el = h('main', { class: 'screen screen--home' },
    h('div', { class: 'hud-row' },
      h('img', { class: 'hud-shield', src: 'design-system/logos/football-heroes-shield.png', alt: 'Football Heroes' }),
      Capsule(h('span', { class: 'label' }, 'WORLD EDITION'), h('span', { class: 'numeric' }, '2026'))),
    h('div', { class: 'home__grid' },
      Card({ class: 'card--featured mode-card' },
        h('span', { class: 'caption mode-card__kicker' }, 'FEATURED MODE'),
        h('h1', { class: 'display-xl' }, 'QUICK MATCH'),
        h('p', { class: 'body text-muted' }, 'Pick one of the 32 nations from the 2026 World Cup knockouts and play a full 90 minutes in the time you choose.'),
        Button('PLAY', { variant: 'primary', onClick: play })),
      h('button', { class: 'card tile', type: 'button', onClick: () => go('teamSelect', { mode: 'browse' }) },
        h('span', { class: 'title' }, 'TEAMS'),
        h('span', { class: 'body text-muted' }, 'Browse all 32 squads and ratings.')),
      h('button', { class: 'card tile', type: 'button', onClick: () => Dialog({ title: 'HOW TO PLAY', body: howToPlay() }) },
        h('span', { class: 'title' }, 'HOW TO PLAY'),
        h('span', { class: 'body text-muted' }, 'Controls for touch and keyboard.'))));
  return { el };
}
