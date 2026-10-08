import { h } from '../components.js';

const ROWS = [
  ['MOVE', 'Drag the joystick', 'WASD or arrows'],
  ['PASS', 'Tap PASS (aims with the joystick)', 'Space or J'],
  ['SHOOT', 'Hold SHOOT to power up, release to shoot', 'Hold K'],
  ['SWITCH', 'Tap PASS when you do not have the ball', 'Space or J'],
  ['TACKLE', 'Tap SHOOT near the ball carrier', 'K'],
  ['SPRINT', 'Hold SPRINT', 'Shift or L'],
  ['PAUSE', 'Tap the pause button', 'P or Esc'],
];

export function howToPlay() {
  return h('div', { class: 'howto' },
    h('p', { class: 'body text-muted' }, 'You control the player with the yellow ring. Over-power a shot (red bar) and it may fly wide.'),
    h('table', { class: 'howto__table' },
      h('thead', {}, h('tr', {},
        h('th', { class: 'caption', scope: 'col' }, 'ACTION'),
        h('th', { class: 'caption', scope: 'col' }, 'TOUCH'),
        h('th', { class: 'caption', scope: 'col' }, 'KEYBOARD'))),
      h('tbody', {}, ROWS.map(([a, t, k]) => h('tr', {},
        h('th', { class: 'label', scope: 'row' }, a),
        h('td', { class: 'body' }, t),
        h('td', { class: 'body text-muted' }, k))))));
}
