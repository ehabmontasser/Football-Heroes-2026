// Supabase match history. Each device signs in anonymously; row level security
// keeps every player's matches private to them. All calls fail soft so the
// game still works offline or if Supabase is unreachable.

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';

// Public client settings. The publishable key is meant to ship in the browser;
// access is enforced by the RLS policies in supabase/migrations.
const SUPABASE_URL = 'https://xtrjuwvytdfcckgcmqhx.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_AucZF9YKd3o7BpfGyuJ9qQ_yl8tHd8q';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'fh26-auth' },
});

let sessionPromise = null;

// Reuse the stored session, or create an anonymous player the first time.
function ensureSession() {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) return data.session;
      const { data: signIn, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      return signIn.session;
    })().catch((err) => {
      sessionPromise = null; // allow a retry next time
      throw err;
    });
  }
  return sessionPromise;
}

export async function saveMatch(summary, { duration, difficulty }) {
  try {
    await ensureSession();
    const strip = ({ team, score, ...stats }) => stats;
    const { error } = await supabase.from('matches').insert({
      home_team: summary.home.team.id,
      away_team: summary.away.team.id,
      home_score: summary.home.score,
      away_score: summary.away.score,
      duration_min: duration,
      difficulty,
      goals: summary.goals,
      stats: { home: strip(summary.home), away: strip(summary.away) },
    });
    if (error) throw error;
    return { ok: true };
  } catch (error) {
    console.warn('Match not saved:', error.message || error);
    return { ok: false, error };
  }
}

export async function listMatches(limit = 30) {
  try {
    await ensureSession();
    const { data, error } = await supabase
      .from('matches')
      .select('id, home_team, away_team, home_score, away_score, duration_min, difficulty, goals, played_at')
      .order('played_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return { ok: true, matches: data };
  } catch (error) {
    console.warn('Match history unavailable:', error.message || error);
    return { ok: false, error, matches: [] };
  }
}
