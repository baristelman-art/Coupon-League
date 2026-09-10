// POST /api/analyze
// Body: { image: "data:image/jpeg;base64,...", nickname: "..." }
// Görseli Claude'a gönderir, oran/maç sayısı/kazandı-kaybetti bilgisini çıkarır,
// kazandıysa Supabase'e kaydeder ve sırasını döner.

import { supabase } from '../../lib/db';

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Sadece POST' });
  }

  const { image, nickname } = req.body;

  if (!image || !nickname || !nickname.trim()) {
    return res.status(400).json({ error: 'Görsel ve rumuz gerekli.' });
  }

  const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) {
    return res.status(400).json({ error: 'Geçersiz görsel formatı.' });
  }
  const mediaType = match[1];
  const base64 = match[2];

  try {
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
                '{"toplam_oran": <number>, "mac_sayisi": <integer>, "durum": "kazandi" or "kaybetti" or "belirsiz", "gecerli_kupon": true/false}. ' +
                'If the combined/total odds are printed on the slip, use that value; otherwise multiply the individual odds shown. ' +
                'If the image does not look like a betting slip, set gecerli_kupon to false.'
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
