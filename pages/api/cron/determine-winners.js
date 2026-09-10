// GET /api/cron/determine-winners
// Vercel Cron her gün UTC 00:00'da bunu çağırır. Manuel test için de çalıştırılabilir.
import { supabase } from '../../../lib/db';

async function topEntryInRange(start, end) {
  const { data, error } = await supabase
    .from('entries')
    .select('nickname, score, odds, matches')
    .gte('created_at', start)
    .lt('created_at', end)
    .order('score', { ascending: false })
    .limit(1);
  if (error) throw error;
  return data && data.length > 0 ? data[0] : null;
}

async function upsertWinner(periodType, start, end, winner) {
  if (!winner) return;
  await supabase.from('winners').upsert({
    period_type: periodType,
    period_start: start,
    period_end: end,
    nickname: winner.nickname,
    score: winner.score,
    odds: winner.odds,
    matches: winner.matches
  }, { onConflict: 'period_type,period_start' });
}

export default async function handler(req, res) {
  // Vercel Cron, CRON_SECRET tanımlıysa isteğe otomatik "Authorization: Bearer <secret>" ekler.
  const auth = req.headers.authorization;
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const results = {};

  try {
    // 1) Günlük: dün
    const yesterdayStart = new Date(todayUTC.getTime() - 24 * 60 * 60 * 1000);
    const dailyWinner = await topEntryInRange(yesterdayStart.toISOString(), todayUTC.toISOString());
    await upsertWinner('daily', yesterdayStart.toISOString(), todayUTC.toISOString(), dailyWinner);
    results.daily = dailyWinner;

    // 2) Haftalık: sadece bugün Pazartesi ise, geçen haftayı kapat
    if (now.getUTCDay() === 1) {
      const weekStart = new Date(todayUTC.getTime() - 7 * 24 * 60 * 60 * 1000);
      const weeklyWinner = await topEntryInRange(weekStart.toISOString(), todayUTC.toISOString());
      await upsertWinner('weekly', weekStart.toISOString(), todayUTC.toISOString(), weeklyWinner);
      results.weekly = weeklyWinner;
    }

    // 3) Aylık: sadece ayın 1'i ise, geçen ayı kapat
    if (now.getUTCDate() === 1) {
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
      const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const monthlyWinner = await topEntryInRange(monthStart.toISOString(), monthEnd.toISOString());
      await upsertWinner('monthly', monthStart.toISOString(), monthEnd.toISOString(), monthlyWinner);
      results.monthly = monthlyWinner;
    }

    return res.status(200).json({ ok: true, results });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
