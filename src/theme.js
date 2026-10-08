// Reads design tokens from CSS custom properties so canvas code never retypes hex.

const cache = new Map();

export function token(name) {
  if (!cache.has(name)) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
    cache.set(name, value);
  }
  return cache.get(name);
}

// Token colors that need `navy-950` text on top (brand rule).
const LIGHT_FILLS = new Set(['sun-gold', 'sun-amber', 'badge-yellow', 'cyan-energy', 'featured-lime', 'ink', 'ink-muted']);

export const textOn = (fillToken) => (LIGHT_FILLS.has(fillToken) ? 'navy-950' : 'ink');

export function rgb(name) {
  const hex = token(name).replace('#', '');
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

export function rgba(name, alpha) {
  const [r, g, b] = rgb(name);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function colorDistance(a, b) {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  return Math.hypot(r1 - r2, g1 - g2, b1 - b2);
}

// Pick an away kit that reads clearly against the home kit.
export function resolveKits(home, away) {
  const homeKit = home.kit.primary;
  const candidates = [away.kit.primary, away.kit.secondary, 'ink', 'navy-950', 'badge-yellow'];
  const awayKit = candidates.find((c) => colorDistance(c, homeKit) > 140) || 'badge-yellow';
  return { home: homeKit, away: awayKit };
}
