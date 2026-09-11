// GET /api/leaderboard?limit=20&period=daily|weekly|monthly|all
import { supabase } from '../../lib/db';
import { getPeriodStart } from '../../lib/periods';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET only' });
  }

  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const period = req.query.period || 'all';
  const start = getPeriodStart(period);

  let query = supabase
    .from('entries')
    .select('nickname, odds, matches, score, status, created_at')
    .order('score', { ascending: false })
    .limit(limit);

  if (start) query = query.gte('created_at', start);

  const { data, error } = await query;

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ entries: data });
}
