// Shared Supabase clients for the Vercel serverless API.
// Requires:  npm i @supabase/supabase-js
// Env vars (set in Vercel project settings):
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL!;

// Public reads / score inserts (RLS enforced).
export const supabase = createClient(url, process.env.SUPABASE_ANON_KEY!);

// Admin writes (bypasses RLS) — only ever used behind an authenticated route.
export const supabaseAdmin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export function cors(res: { setHeader: (k: string, v: string) => void }) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Map DB snake_case <-> client camelCase for settings.
export const settingsFromDb = (r: Record<string, unknown>) => ({
  mode: r.mode,
  questionsPerGame: r.questions_per_game,
  speedBonus: r.speed_bonus,
  speedrunBonus: r.speedrun_bonus,
  perQuestionScoreDisplay: r.per_question_score_display,
  randomize: r.randomize,
  sound: r.sound,
});
