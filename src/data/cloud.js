// Supabase player profile and match history. A player signs in anonymously
// (with an hCaptcha check) the first time they enter a name; row level security
// keeps every player's matches private to them. All calls fail soft so the game
// still works offline or if Supabase is unreachable.

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';

// Public client settings. The publishable key and hCaptcha site key are meant to
// ship in the browser; access is enforced by the RLS policies in supabase/migrations
// and by the CAPTCHA secret stored in Supabase Auth.
const SUPABASE_URL = 'https://xtrjuwvytdfcckgcmqhx.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_AucZF9YKd3o7BpfGyuJ9qQ_yl8tHd8q';
export const HCAPTCHA_SITE_KEY = '104a8db0-8be0-4b42-839a-c402a6e26bd4';

const NAME_KEY = 'fh26-name';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'fh26-auth' },
});

const store = {
  get() { try { return localStorage.getItem(NAME_KEY); } catch { return null; } },
  set(v) { try { localStorage.setItem(NAME_KEY, v); } catch { /* private mode */ } },
};

// 2-16 characters: letters (any language), digits, spaces, dot, dash, underscore.
export function cleanName(raw) {
  const name = String(raw || '').replace(/\s+/g, ' ').trim();
  if (name.length < 2 || name.length > 16) return { ok: false, message: 'Use 2 to 16 characters.' };
  if (!/^[\p{L}\p{N} ._-]+$/u.test(name)) return { ok: false, message: 'Use letters, numbers, spaces, dots, dashes or underscores.' };
  return { ok: true, name };
}

async function currentSession() {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session;
  } catch {
    return null;
  }
}

// Who is playing: { name, signedIn }. `name` falls back to the local copy offline.
export async function getPlayer() {
  const session = await currentSession();
  const remote = session && session.user.user_metadata && session.user.user_metadata.display_name;
  if (remote) store.set(remote);
  return { name: remote || store.get(), signedIn: !!session };
}

// First visit: create the anonymous player with their name. Needs a CAPTCHA token.
export async function signIn(name, captchaToken) {
  const { error } = await supabase.auth.signInAnonymously({
    options: { captchaToken, data: { display_name: name } },
  });
  if (error) return { ok: false, message: friendlyAuthError(error) };
  store.set(name);
  return { ok: true };
}

// Change the name of an existing player (no CAPTCHA needed once signed in).
export async function setName(name) {
  store.set(name);
  if (!(await currentSession())) return { ok: true, offline: true };
  const { error } = await supabase.auth.updateUser({ data: { display_name: name } });
  if (error) return { ok: false, message: friendlyAuthError(error) };
  return { ok: true };
}

// Keep a name locally when Supabase is unavailable; matches are not saved.
export const setOfflineName = (name) => store.set(name);

function friendlyAuthError(error) {
  const code = error.code || '';
  if (code.includes('captcha')) return 'The human check failed. Please try it again.';
  if (code === 'over_request_rate_limit') return 'Too many attempts. Wait a minute and try again.';
  if (error.message && /fetch|network/i.test(error.message)) return 'You seem to be offline.';
  return 'Could not sign you in right now. Please try again.';
}

export async function saveMatch(summary, { duration, difficulty, opponentName = null }) {
  try {
    const session = await currentSession();
    if (!session) return { ok: false, reason: 'signed-out' };
    const strip = ({ team, score, ...stats }) => stats;
    const name = session.user.user_metadata && session.user.user_metadata.display_name;
    const { error } = await supabase.from('matches').insert({
      home_team: summary.home.team.id,
      away_team: summary.away.team.id,
      home_score: summary.home.score,
      away_score: summary.away.score,
      duration_min: duration,
      difficulty,
      goals: summary.goals,
      stats: { home: strip(summary.home), away: strip(summary.away) },
      player_name: name || null,
      opponent_name: opponentName,
    });
    if (error) throw error;
    return { ok: true };
  } catch (error) {
    console.warn('Match not saved:', error.message || error);
    return { ok: false, reason: 'error', error };
  }
}

export async function listMatches(limit = 30) {
  try {
    if (!(await currentSession())) return { ok: false, reason: 'signed-out', matches: [] };
    const { data, error } = await supabase
      .from('matches')
      .select('id, home_team, away_team, home_score, away_score, duration_min, difficulty, opponent_name, goals, played_at')
      .order('played_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return { ok: true, matches: data };
  } catch (error) {
    console.warn('Match history unavailable:', error.message || error);
    return { ok: false, reason: 'error', error, matches: [] };
  }
}
