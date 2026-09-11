// POST /api/admin/reset
// Header: x-admin-password
// Tüm kupon/skor/kazanan/tepki verilerini siler. Geri alınamaz.
import { supabase } from '../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const password = req.headers['x-admin-password'];
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // neq ile "hepsini sil" hilesi: id her zaman bu sahte değere eşit olmayacağı için tüm satırlar silinir.
    const dummyId = '00000000-0000-0000-0000-000000000000';
    await supabase.from('entries').delete().neq('id', dummyId);
    await supabase.from('request_log').delete().neq('id', dummyId);
    await supabase.from('winners').delete().neq('id', dummyId);
    await supabase.from('reactions').delete().neq('id', dummyId);

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
