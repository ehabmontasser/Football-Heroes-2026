import { h } from '../components.js';

export function splashScreen({ go }) {
  const start = () => go('home');
  const el = h('main', { class: 'screen screen--splash', onClick: start },
    h('img', { class: 'splash__logo', src: 'design-system/logos/football-heroes-logo.png', alt: 'Football Heroes 2026' }),
    h('p', { class: 'body splash__sub' }, '32 nations. One pitch. Your 90 minutes.'),
    h('button', { class: 'btn btn--ghost splash__start', type: 'button', onClick: (e) => { e.stopPropagation(); start(); } },
      h('span', { class: 'label' }, 'TAP TO START')));
  const onKey = (e) => { if (e.key === 'Enter' || e.key === ' ') start(); };
  window.addEventListener('keydown', onKey);
  return { el, destroy: () => window.removeEventListener('keydown', onKey) };
}
