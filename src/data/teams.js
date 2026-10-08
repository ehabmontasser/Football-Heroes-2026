// The 32 nations of the 2026 World Cup Round of 32. `top16` marks the teams
// that reached the Round of 16. Results verified October 2026 from:
//   https://currentaffairs.adda247.com/fifa-world-cup-2026-round-of-32-results-updated-scores-winners-last-16-qualifiers/
//   https://life.liga.net/en/sport/news/2026-world-cup-results-of-the-round-of-16-and-the-playoff-bracket
//   https://www.mappr.co/?p=64683 (Spain champions, full bracket)
// Country names only: no federation crests or marks. Players are fictional.
// Kit colors are design-token names (see design-system/tokens.json).

import { NAME_POOLS, seededRng } from './names.js';

const FINISH = {
  champion: 'Champion',
  runnerUp: 'Runner-up',
  third: 'Third place',
  fourth: 'Fourth place',
  qf: 'Quarter-final',
  r16: 'Round of 16',
  r32: 'Round of 32',
};

const TEAM_DEFS = [
  // Round of 16 and beyond
  { id: 'esp', name: 'Spain', code: 'ESP', rating: 88, finish: FINISH.champion, pool: 'hispanic', kit: ['cta-red', 'sun-gold'] },
  { id: 'arg', name: 'Argentina', code: 'ARG', rating: 87, finish: FINISH.runnerUp, pool: 'hispanic', kit: ['cyan-energy', 'ink'] },
  { id: 'eng', name: 'England', code: 'ENG', rating: 86, finish: FINISH.third, pool: 'english', kit: ['ink', 'navy-900'] },
  { id: 'fra', name: 'France', code: 'FRA', rating: 86, finish: FINISH.fourth, pool: 'french', kit: ['sky-500', 'ink'] },
  { id: 'mar', name: 'Morocco', code: 'MAR', rating: 84, finish: FINISH.qf, pool: 'maghreb', kit: ['ad-red', 'featured-lime'] },
  { id: 'bel', name: 'Belgium', code: 'BEL', rating: 84, finish: FINISH.qf, pool: 'belgian', kit: ['cta-red', 'badge-yellow'] },
  { id: 'nor', name: 'Norway', code: 'NOR', rating: 83, finish: FINISH.qf, pool: 'nordic', kit: ['cta-red', 'navy-950'] },
  { id: 'sui', name: 'Switzerland', code: 'SUI', rating: 83, finish: FINISH.qf, pool: 'swiss', kit: ['cta-red', 'ink'] },
  { id: 'bra', name: 'Brazil', code: 'BRA', rating: 83, finish: FINISH.r16, pool: 'lusophone', kit: ['badge-yellow', 'sky-500'] },
  { id: 'por', name: 'Portugal', code: 'POR', rating: 82, finish: FINISH.r16, pool: 'lusophone', kit: ['ad-red', 'featured-lime'] },
  { id: 'col', name: 'Colombia', code: 'COL', rating: 81, finish: FINISH.r16, pool: 'hispanic', kit: ['badge-yellow', 'navy-900'] },
  { id: 'mex', name: 'Mexico', code: 'MEX', rating: 80, finish: FINISH.r16, pool: 'hispanic', kit: ['featured-lime', 'ink'] },
  { id: 'usa', name: 'USA', code: 'USA', rating: 80, finish: FINISH.r16, pool: 'american', kit: ['ink', 'navy-900'] },
  { id: 'par', name: 'Paraguay', code: 'PAR', rating: 79, finish: FINISH.r16, pool: 'hispanic', kit: ['cta-red', 'ink'] },
  { id: 'can', name: 'Canada', code: 'CAN', rating: 79, finish: FINISH.r16, pool: 'canadian', kit: ['cta-red', 'ink'] },
  { id: 'egy', name: 'Egypt', code: 'EGY', rating: 78, finish: FINISH.r16, pool: 'egyptian', kit: ['cta-red', 'ink'] },
  // Out in the Round of 32
  { id: 'ger', name: 'Germany', code: 'GER', rating: 80, finish: FINISH.r32, pool: 'germanic', kit: ['ink', 'navy-950'] },
  { id: 'ned', name: 'Netherlands', code: 'NED', rating: 80, finish: FINISH.r32, pool: 'dutch', kit: ['sun-amber', 'navy-900'] },
  { id: 'cro', name: 'Croatia', code: 'CRO', rating: 79, finish: FINISH.r32, pool: 'balkan', kit: ['ink', 'cta-red'] },
  { id: 'jpn', name: 'Japan', code: 'JPN', rating: 78, finish: FINISH.r32, pool: 'japanese', kit: ['sky-500', 'ink'] },
  { id: 'sen', name: 'Senegal', code: 'SEN', rating: 77, finish: FINISH.r32, pool: 'westAfrican', kit: ['ink', 'featured-lime'] },
  { id: 'aut', name: 'Austria', code: 'AUT', rating: 76, finish: FINISH.r32, pool: 'austrian', kit: ['cta-red', 'ink'] },
  { id: 'civ', name: 'Ivory Coast', code: 'CIV', rating: 76, finish: FINISH.r32, pool: 'westAfrican', kit: ['sun-amber', 'ink'] },
  { id: 'swe', name: 'Sweden', code: 'SWE', rating: 75, finish: FINISH.r32, pool: 'swedish', kit: ['badge-yellow', 'sky-500'] },
  { id: 'ecu', name: 'Ecuador', code: 'ECU', rating: 75, finish: FINISH.r32, pool: 'hispanic', kit: ['badge-yellow', 'sky-500'] },
  { id: 'alg', name: 'Algeria', code: 'ALG', rating: 74, finish: FINISH.r32, pool: 'maghreb', kit: ['ink', 'featured-lime'] },
  { id: 'aus', name: 'Australia', code: 'AUS', rating: 73, finish: FINISH.r32, pool: 'australian', kit: ['sun-gold', 'featured-lime'] },
  { id: 'gha', name: 'Ghana', code: 'GHA', rating: 73, finish: FINISH.r32, pool: 'westAfrican', kit: ['ink', 'navy-950'] },
  { id: 'cod', name: 'DR Congo', code: 'COD', rating: 72, finish: FINISH.r32, pool: 'centralAfrican', kit: ['cyan-energy', 'cta-red'] },
  { id: 'bih', name: 'Bosnia and Herzegovina', code: 'BIH', rating: 72, finish: FINISH.r32, pool: 'balkan', kit: ['sky-500', 'badge-yellow'] },
  { id: 'rsa', name: 'South Africa', code: 'RSA', rating: 71, finish: FINISH.r32, pool: 'southernAfrican', kit: ['badge-yellow', 'featured-lime'] },
  { id: 'cpv', name: 'Cape Verde', code: 'CPV', rating: 70, finish: FINISH.r32, pool: 'lusophone', kit: ['sky-500', 'cta-red'] },
];

// 18-man squad: 2 GK, 6 DF, 6 MF, 4 FW. First 11 (1-4-4-2) start.
const SQUAD_SHAPE = [
  'GK', 'DF', 'DF', 'DF', 'DF', 'MF', 'MF', 'MF', 'MF', 'FW', 'FW',
  'GK', 'DF', 'DF', 'MF', 'MF', 'FW', 'FW',
];
const STARTER_NUMBERS = [1, 2, 4, 5, 3, 7, 6, 8, 11, 9, 10];
const BENCH_NUMBERS = [12, 13, 14, 15, 16, 17, 18];

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function buildSquad(def) {
  const rng = seededRng(def.id + '-fh26');
  const pool = NAME_POOLS[def.pool];
  const used = new Set();
  return SQUAD_SHAPE.map((pos, i) => {
    let name;
    do {
      const first = pool.first[Math.floor(rng() * pool.first.length)];
      const last = pool.last[Math.floor(rng() * pool.last.length)];
      name = `${first} ${last}`;
    } while (used.has(name));
    used.add(name);
    const starter = i < 11;
    const base = def.rating + (starter ? 0 : -4);
    const overall = clamp(Math.round(base + (rng() * 8 - 4)), 55, 94);
    const jitter = () => Math.round(rng() * 10 - 5);
    // Position-weighted attributes around the overall rating.
    const bias = {
      GK: { pace: -14, shooting: -30, passing: -8, defending: 4 },
      DF: { pace: -2, shooting: -14, passing: -4, defending: 6 },
      MF: { pace: 0, shooting: -2, passing: 6, defending: -4 },
      FW: { pace: 5, shooting: 7, passing: -2, defending: -20 },
    }[pos];
    return {
      id: `${def.id}-${i}`,
      name,
      short: name.split(' ').slice(1).join(' '),
      pos,
      number: starter ? STARTER_NUMBERS[i] : BENCH_NUMBERS[i - 11],
      starter,
      overall,
      pace: clamp(overall + bias.pace + jitter(), 30, 99),
      shooting: clamp(overall + bias.shooting + jitter(), 20, 99),
      passing: clamp(overall + bias.passing + jitter(), 30, 99),
      defending: clamp(overall + bias.defending + jitter(), 20, 99),
    };
  });
}

export const TEAMS = TEAM_DEFS.map((def) => ({
  ...def,
  top16: def.finish !== FINISH.r32,
  kit: { primary: def.kit[0], secondary: def.kit[1] },
  squad: buildSquad(def),
}));

export const getTeam = (id) => TEAMS.find((t) => t.id === id);
