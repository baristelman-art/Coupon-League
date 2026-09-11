// POST /api/analyze
// Body: { image: "data:image/jpeg;base64,...", nickname: "..." }
// Görseli Claude'a gönderir, oran/maç sayısı/kazandı-kaybetti bilgisini çıkarır,
// kazandıysa Supabase'e kaydeder ve sırasını döner.

import { supabase } from '../../lib/db';
import crypto from 'crypto';

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } }
};

const HOURLY_LIMIT = 10;   // aynı IP'den saatte en fazla 10 analiz denemesi
const DAILY_LIMIT = 30;    // aynı IP'den günde en fazla 30 analiz denemesi

function hashValue(value) {
  const salt = (process.env.ANTHROPIC_API_KEY || 'fallback-salt').slice(0, 12);
  return crypto.createHash('sha256').update(salt + ':' + value).digest('hex');
}

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const { image, nickname } = req.body;

  if (!image || !nickname || !nickname.trim()) {
    return res.status(400).json({ error: 'Image and nickname are required.' });
  }

  const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) {
    return res.status(400).json({ error: 'Invalid image format.' });
  }
  const mediaType = match[1];
  const base64 = match[2];

  const ipHash = hashValue(getClientIp(req));
  const imageHash = hashValue(base64.slice(0, 5000)); // görselin baş kısmından hash, yeterince ayırt edici

  try {
    // 1) Hız sınırı kontrolü
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { count: hourlyCount, error: hourlyErr } = await supabase
      .from('request_log')
      .select('*', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('created_at', oneHourAgo);
    if (hourlyErr) throw hourlyErr;

    if ((hourlyCount || 0) >= HOURLY_LIMIT) {
      return res.status(429).json({ error: 'Too many attempts. Please try again later.' });
    }

    const { count: dailyCount, error: dailyErr } = await supabase
      .from('request_log')
      .select('*', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('created_at', oneDayAgo);
    if (dailyErr) throw dailyErr;

    if ((dailyCount || 0) >= DAILY_LIMIT) {
      return res.status(429).json({ error: 'Daily attempt limit reached. Try again tomorrow.' });
    }

    // 2) Aynı kuponun tekrar yüklenip yüklenmediğini kontrol et
    const { data: existing, error: dupErr } = await supabase
      .from('request_log')
      .select('id')
      .eq('image_hash', imageHash)
      .limit(1);
    if (dupErr) throw dupErr;

    if (existing && existing.length > 0) {
      return res.status(409).json({ error: 'This slip has already been submitted.' });
    }

    // 3) Denemeyi logla (sonuç ne olursa olsun, hem sınır hem tekrar kontrolü için)
    await supabase.from('request_log').insert({ ip_hash: ipHash, image_hash: imageHash });

    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            {
              type: 'text',
              text: 'This is a screenshot of a sports betting slip. Reply with ONLY JSON in this exact format, no other text: ' +
                '{"toplam_oran": <number>, "mac_sayisi": <integer>, "durum": "kazandi" or "kaybetti", "gecerli_kupon": true/false}. ' +
                '\n\nODDS FORMAT: Odds may be shown as American odds (e.g. -115, +327, +8130) or decimal odds (e.g. 1.91, 2.00). ' +
                'Convert everything to decimal-equivalent before computing toplam_oran: ' +
                'for positive American odds, decimal = (odds / 100) + 1; for negative American odds, decimal = (100 / abs(odds)) + 1. ' +
                '\n\nCALCULATING ODDS: If an actual settled Wager and Payout/Paid amount are both shown (not "To Win" or "Potential Payout", which are pre-settlement estimates), prefer toplam_oran = payout / wager — this is the most accurate figure. Otherwise use a printed total/combined odds for the whole parlay, or multiply the decimal-equivalent odds of each individual leg. ' +
                '\n\nONLY ACCEPT SETTLED, PAID-OUT SLIPS: This is the most important rule. gecerli_kupon must be true ONLY if the slip clearly shows a final, settled result with real money already paid: ' +
                'either an explicit "Won"/"WON" label with a received payout amount, or an explicit "Lost"/"LOSE" label. ' +
                'Set gecerli_kupon to FALSE for anything else, including: a bet slip that has not been placed yet (buttons like "Place Bet", "Accept & Place Bet", "Log In to Bet", "Clear All", per-pick remove/trash/X icons, a $0 or "Enter Wager" field); ' +
                'a bet that is still open, live, or in-progress (e.g. a "Cash Out" button, an "Open"/"Live" tab, a bet-confirmation screen like "Good Luck!" with no result yet); ' +
                'or any screen showing only a potential/estimated payout ("To Win", "Potential Payout", "PAYS $X" without a Won/Lost label) rather than an actual settled one. ' +
                'Decorative graphics (trophies, confetti, banners) are NOT proof of settlement by themselves — some templates reuse them for unsettled bets too. When in doubt, set gecerli_kupon to false rather than guessing. ' +
                '\n\nMULTIPLE SLIPS: If more than one separate, distinct bet slip appears stacked in the same screenshot, use only the first (topmost) one. ' +
                '\n\nOTHER INVALID CASES: Also set gecerli_kupon to false if the image is not a real sports betting slip at all (e.g. a promotional graphic, an empty betslip mockup, unrelated content).'
            }
          ]
        }]
      })
    });

    const aiData = await aiResponse.json();

    if (!aiResponse.ok) {
      const msg = aiData?.error?.message || `HTTP ${aiResponse.status}`;
      return res.status(502).json({ error: 'Analiz servisi hatası: ' + msg });
    }

    const textBlock = (aiData.content || []).find(c => c.type === 'text');
    if (!textBlock) {
      return res.status(502).json({ error: 'Model boş yanıt döndürdü.' });
    }

    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(502).json({ error: 'Model geçerli JSON döndürmedi.' });
    }
    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.gecerli_kupon) {
      return res.status(200).json({ valid: false });
    }

    const odds = Number(parsed.toplam_oran) || 0;
    const matches = Number(parsed.mac_sayisi) || 0;
    const won = parsed.durum === 'kazandi';
    const score = won ? Math.round(odds * 10 + matches * 5) : 0;

    let rank = null;

    if (won) {
      const { data: inserted, error: insertErr } = await supabase
        .from('entries')
        .insert({ nickname: nickname.trim(), odds, matches, score, won })
        .select()
        .single();

      if (insertErr) throw insertErr;

      const { count, error: countErr } = await supabase
        .from('entries')
        .select('*', { count: 'exact', head: true })
        .gt('score', score);

      if (countErr) throw countErr;
      rank = (count || 0) + 1;
    }

    return res.status(200).json({
      valid: true,
      won,
      odds,
      matches,
      score,
      rank,
      durum: parsed.durum
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Sunucu hatası: ' + err.message });
  }
}
