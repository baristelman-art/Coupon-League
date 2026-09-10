// UTC bazlı periyot başlangıç zamanlarını hesaplar.
export function getPeriodStart(period) {
  const now = new Date();

  if (period === 'daily') {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
  }

  if (period === 'weekly') {
    const day = now.getUTCDay(); // 0=Pazar, 1=Pazartesi...
    const diffToMonday = day === 0 ? 6 : day - 1;
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diffToMonday)).toISOString();
  }

  if (period === 'monthly') {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  }

  return null; // 'all' -> filtre yok
}
