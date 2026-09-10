// GET /api/winners -> her periyot için en son belirlenen kazananı döner
import { supabase } from '../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET only' });
  }

  const results = {};

  for (const periodType of ['daily', 'weekly', 'monthly']) {
    const { data, error } = await supabase
      .from('winners')
      .select('nickname, score, odds, matches, period_start, period_end')
      .eq('period_type', periodType)
      .order('period_start', { ascending: false })
      .limit(1);

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    results[periodType] = data && data.length > 0 ? data[0] : null;
  }

  return res.status(200).json(results);
}
