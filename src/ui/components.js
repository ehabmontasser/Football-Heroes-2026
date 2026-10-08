// Small DOM builders for the design-system components (see BRAND.md > Components).

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') {
      for (const [prop, val] of Object.entries(v)) {
        if (prop.startsWith('--')) el.style.setProperty(prop, val);
        else el.style[prop] = val;
      }
    }
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

// Primary (cta-red, one per screen) or secondary (navy-700) button.
export const Button = (label, { variant = 'secondary', onClick, small, ...rest } = {}) =>
  h('button', { class: `btn btn--${variant}${small ? ' btn--small' : ''}`, type: 'button', onClick, ...rest },
    h('span', { class: small ? 'label' : 'title' }, label));

export const Card = (attrs, ...children) => h('section', { ...attrs, class: `card ${attrs.class || ''}` }, ...children);

export const Capsule = (...children) => h('div', { class: 'capsule' }, ...children);

export const Badge = (text) => h('span', { class: 'badge caption' }, text);

export const Chip = (label, { selected, onClick, ...rest } = {}) =>
  h('button', { class: `chip label${selected ? ' is-selected' : ''}`, type: 'button', 'aria-pressed': selected ? 'true' : 'false', onClick, ...rest }, label);

// Two-tone slanted kit swatch (stands in for flags; no national emblems).
export const KitSwatch = (team, size = 'md') =>
  h('span', {
    class: `kit-swatch kit-swatch--${size}`,
    style: { '--kit-a': `var(--${team.kit.primary})`, '--kit-b': `var(--${team.kit.secondary})` },
    'aria-hidden': 'true',
  });

// Solid white 24px glyph from SVG path markup (no icon set yet).
export const Glyph = (markup) =>
  h('span', { class: 'glyph', 'aria-hidden': 'true', html: `<svg viewBox="0 0 24 24" width="24" height="24">${markup}</svg>` });

// Back button for screen headers: a simple solid white chevron glyph.
export const BackButton = (onClick) =>
  h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Back', onClick },
    Glyph('<path d="M15.5 3 6.5 12l9 9 2.5-2.5L11.5 12 18 5.5z" fill="currentColor"/>'));

export const ScreenHeader = (title, onBack, right) =>
  h('header', { class: 'screen-header' },
    onBack ? BackButton(onBack) : null,
    h('h1', { class: 'display-lg screen-header__title' }, title),
    right || null);

export function Dialog({ title, body, actions, onClose }) {
  const overlay = h('div', { class: 'overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': title });
  const close = () => { overlay.remove(); onClose && onClose(); };
  overlay.append(
    Card({ class: 'dialog' },
      h('h2', { class: 'display-lg' }, title),
      body,
      h('div', { class: 'dialog__actions' }, ...(actions ? actions(close) : [Button('GOT IT', { onClick: close })]))));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.body.append(overlay);
  const first = overlay.querySelector('button');
  first && first.focus();
  return close;
}

export const formatNumber = (n) => n.toLocaleString('en-US');
