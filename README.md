# Kupon Ligi — Kurulum

## 1) Supabase (veritabanı) kurulumu
1. https://supabase.com adresinden ücretsiz bir hesap aç, yeni proje oluştur.
2. Sol menüden **SQL Editor**'e git, `supabase-schema.sql` dosyasının içeriğini yapıştırıp **Run**'a bas.
3. Sol menüden **Project Settings > API**'ye git. Şunları not al:
   - `Project URL` → bu senin `SUPABASE_URL` değerin
   - `service_role` anahtarı (secret) → bu senin `SUPABASE_SERVICE_KEY` değerin (asla tarayıcıya/GitHub'a koyma!)

## 2) Anthropic API anahtarı
1. https://console.anthropic.com adresinden bir hesap aç, **API Keys** bölümünden yeni anahtar oluştur.
2. Bu senin `ANTHROPIC_API_KEY` değerin. Ödeme/kredi eklemen gerekir (kullanım başına ücretlendirilir).

## 3) Yerelde çalıştırma (opsiyonel test)
```bash
npm install
cp .env.example .env.local   # sonra .env.local içine gerçek değerleri yaz
npm run dev
```
Tarayıcıda http://localhost:3000 aç.

## 4) Vercel'e deploy
1. Bu projeyi bir GitHub reposuna yükle.
2. https://vercel.com adresinde "New Project" ile bu repoyu seç.
3. **Environment Variables** kısmına şunları ekle:
   - `ANTHROPIC_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
4. Deploy'a bas. Birkaç dakika içinde `senin-proje.vercel.app` adresinde canlıya alınır.

## 5) Shopify'a bağlama
Shopify admin panelinde bir sayfa oluştur (Online Store > Pages), içine şunu ekle:
```html
<a href="https://senin-proje.vercel.app" target="_blank"
   style="display:inline-block;padding:14px 28px;background:#FFB627;color:#0A1128;
   font-weight:700;text-decoration:none;border-radius:6px;">
  Kuponunu Yükle, Ligde Yerini Gör
</a>
```
Ya da menüne/navigasyona bir link olarak ekleyebilirsin.

## Sonraki adımlar (istersen birlikte yaparız)
- Kazananlara otomatik Shopify indirim kodu üretme (Shopify Admin API)
- Belirli aralıklarla (haftalık/aylık) "sezon" sıfırlama
- Sahte/manipüle edilmiş kupon tespiti için ekstra kontroller
- Rate limiting (aynı kişinin spam kupon yüklemesini engelleme)
