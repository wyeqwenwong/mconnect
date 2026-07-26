import { supabaseAdmin, settingsFromDb, cors } from '../_supabase.js';

// PUT /api/admin/settings — update game configuration (admin only).
// Protect this route with auth in production (Supabase Auth JWT / middleware).
export default async function handler(req: any, res: any) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'PUT') return res.status(405).json({ error: 'method not allowed' });

  const s = req.body ?? {};
  const { data, error } = await supabaseAdmin
    .from('settings')
    .update({
      mode: s.mode,
      questions_per_game: s.questionsPerGame,
      speed_bonus: s.speedBonus,
      speedrun_bonus: s.speedrunBonus,
      per_question_score_display: s.perQuestionScoreDisplay,
      randomize: s.randomize,
      sound: s.sound,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json(settingsFromDb(data));
}
