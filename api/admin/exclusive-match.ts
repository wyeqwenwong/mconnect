import { supabaseAdmin, cors } from '../_supabase.js';

// POST /api/admin/exclusive-match { id } — deactivate every OTHER match question
// so only one Mix & Match question is ever active (admin only).
export default async function handler(req: any, res: any) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  const keepId = req.body?.id;
  if (!keepId) return res.status(400).json({ error: 'id required' });
  const { error } = await supabaseAdmin
    .from('questions')
    .update({ active: false })
    .eq('kind', 'match')
    .neq('id', keepId);
  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json({ ok: true });
}
