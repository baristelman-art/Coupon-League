// GET /api/leaderboard?limit=20
import { supabase } from '../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Sadece GET' });
  }

  const limit = Math.min(Number(req.query.limit) || 20, 100);

  const { data, error } = await supabase
    .from('entries')
    .select('nickname, odds, matches, score, created_at')
    .order('score', { ascending: false })
    .limit(limit);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ entries: data });
}
