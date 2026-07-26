import { supabase, settingsFromDb, cors } from './_supabase.js';

// GET /api/settings — current game configuration (public).
export default async function handler(_req: unknown, res: any) {
  cors(res);
  const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json(settingsFromDb(data));
}
