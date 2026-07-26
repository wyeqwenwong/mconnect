import { supabase, supabaseAdmin, cors } from './_supabase.js';

// GET  /api/panels            — count of panels seen in the last 15s (public)
// POST /api/panels/heartbeat  — upsert this panel's last_seen (see vercel.json)
export default async function handler(req: any, res: any) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    const panelId = req.body?.panelId;
    if (!panelId) return res.status(400).json({ error: 'panelId required' });
    const { error } = await supabaseAdmin
      .from('panels')
      .upsert({ panel_id: panelId, last_seen: new Date().toISOString() });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  const cutoff = new Date(Date.now() - 15_000).toISOString();
  const { count, error } = await supabase
    .from('panels')
    .select('*', { count: 'exact', head: true })
    .gt('last_seen', cutoff);
  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json({ count: count ?? 0 });
}
