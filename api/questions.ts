import { supabase, supabaseAdmin, cors } from './_supabase.js';

// GET    /api/questions            — active pool (public)
// PUT    /api/admin/questions      — upsert (admin; see vercel.json rewrite)
// DELETE /api/admin/questions?id=  — delete (admin)
// This single handler serves both the public GET and admin writes; protect the
// /api/admin/* path with auth middleware / Vercel edge config in production.
export default async function handler(req: any, res: any) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    // Return the whole pool; the client filters active + by mode. The admin
    // console needs inactive questions too.
    const { data, error } = await supabase.from('questions').select('*').order('created_at');
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data ?? []);
  }

  if (req.method === 'PUT') {
    const q = req.body ?? {};
    const { error } = await supabaseAdmin.from('questions').upsert({
      id: q.id,
      kind: q.kind ?? 'quiz',
      points: q.points ?? 100,
      active: q.active ?? true,
      text: q.text ?? null,
      explanation: q.explanation ?? null,
      multi: !!q.multi,
      icon: q.icon ?? null,
      choices: q.choices ?? [],
      prompt: q.prompt ?? null,
      types: q.types ?? [],
      answers: q.answers ?? [],
    });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const id = req.query?.id;
    if (!id) return res.status(400).json({ error: 'id required' });
    const { error } = await supabaseAdmin.from('questions').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: 'method not allowed' });
}
