import { supabase, cors } from './_supabase.js';

// GET /api/leaderboard?limit=100 — ranked scores (public).
export default async function handler(req: any, res: any) {
  cors(res);
  const limit = Math.min(Number(req.query?.limit) || 100, 500);
  const { data, error } = await supabase
    .from('scores')
    .select('id,name,total')
    .order('total', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json((data ?? []).map((r, i) => ({ ...r, rank: i + 1 })));
}
