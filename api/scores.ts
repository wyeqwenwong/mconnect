import { supabase, cors } from './_supabase.js';

// POST /api/scores — submit a final score with per-question breakdown (public).
export default async function handler(req: any, res: any) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  const b = req.body ?? {};
  if (typeof b.name !== 'string' || typeof b.total !== 'number') {
    return res.status(400).json({ error: 'name and total required' });
  }
  const { data, error } = await supabase
    .from('scores')
    .insert({
      name: b.name.slice(0, 40),
      total: b.total,
      perfect_speedrun: !!b.perfectSpeedrun,
      panel_id: b.panelId ?? null,
      breakdown: b.breakdown ?? null,
    })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json(data);
}
