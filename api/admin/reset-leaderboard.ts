import { supabaseAdmin, cors } from '../_supabase.js';

// POST /api/admin/reset-leaderboard — clear all scores (admin only, destructive).
export default async function handler(req: any, res: any) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  const { error } = await supabaseAdmin.from('scores').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json({ ok: true });
}
