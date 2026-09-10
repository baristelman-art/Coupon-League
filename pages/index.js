import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';

export default function Home() {
  const [nickname, setNickname] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ text: '', kind: '' });
  const [result, setResult] = useState(null);
  const [board, setBoard] = useState([]);

  const loadBoard = useCallback(async () => {
    try {
      const res = await fetch('/api/leaderboard?limit=20');
      const data = await res.json();
      setBoard(data.entries || []);
    } catch (e) {
      // sessizce geç, tablo boş kalır
    }
  }, []);

  useEffect(() => { loadBoard(); }, [loadBoard]);

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1200;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setImageDataUrl(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  async function analyze() {
    if (!nickname.trim()) { setStatus({ text: 'Önce bir rumuz gir.', kind: 'err' }); return; }
    if (!imageDataUrl) { setStatus({ text: 'Önce bir kupon görseli seç.', kind: 'err' }); return; }

    setLoading(true);
    setStatus({ text: 'Kupon analiz ediliyor…', kind: '' });
    setResult(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageDataUrl, nickname })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Bilinmeyen hata');

      if (data.valid === false) {
        setStatus({ text: 'Bu görsel bir bahis kuponuna benzemiyor.', kind: 'err' });
        return;
      }

      setResult(data);
      if (data.won) {
        setStatus({ text: 'Kupon skor tablosuna eklendi.', kind: 'ok' });
        loadBoard();
      } else {
        setStatus({ text: 'Sadece kazanan kuponlar skor tablosuna girer.', kind: 'err' });
      }
    } catch (err) {
      setStatus({ text: 'Sorun: ' + err.message, kind: 'err' });
    } finally {
      setLoading(false);
    }
  }

  const [certDataUrl, setCertDataUrl] = useState(null);

  function showCertificate() {
    if (!result || !imageDataUrl) return;
    const canvas = document.createElement('canvas');
    canvas.width = 900; canvas.height = 600;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0A1128';
    ctx.fillRect(0, 0, 900, 600);
    ctx.strokeStyle = '#FFB627';
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 16, 868, 568);

    ctx.fillStyle = '#F4F1E8';
    ctx.font = '700 34px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('KUPON LİGİ SERTİFİKASI', 450, 70);

    const img = new Image();
    img.onload = () => {
      const boxW = 380, boxH = 420, boxX = 50, boxY = 110;
      const scale = Math.min(boxW / img.width, boxH / img.height);
      const dw = img.width * scale, dh = img.height * scale;
      ctx.strokeStyle = '#2A4A3D';
      ctx.strokeRect(boxX - 4, boxY - 4, boxW + 8, boxH + 8);
      ctx.drawImage(img, boxX + (boxW - dw) / 2, boxY + (boxH - dh) / 2, dw, dh);

      const rx = 480;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#8C9C93';
      ctx.font = '600 16px Inter, sans-serif';
      ctx.fillText('RUMUZ', rx, 150);
      ctx.fillStyle = '#F4F1E8';
      ctx.font = '700 28px Inter, sans-serif';
      ctx.fillText(nickname, rx, 182);

      ctx.fillStyle = '#8C9C93';
      ctx.font = '600 16px Inter, sans-serif';
      ctx.fillText('TOPLAM ORAN', rx, 240);
      ctx.fillStyle = '#F4F1E8';
      ctx.font = '700 28px Inter, sans-serif';
      ctx.fillText(result.odds.toFixed(2), rx, 272);

      ctx.fillStyle = '#8C9C93';
      ctx.font = '600 16px Inter, sans-serif';
      ctx.fillText('MAÇ SAYISI', rx, 330);
      ctx.fillStyle = '#F4F1E8';
      ctx.font = '700 28px Inter, sans-serif';
      ctx.fillText(String(result.matches), rx, 362);

      ctx.fillStyle = '#8C9C93';
      ctx.font = '600 16px Inter, sans-serif';
      ctx.fillText('PUAN', rx, 420);
      ctx.fillStyle = '#FFB627';
      ctx.font = '700 56px Inter, sans-serif';
      ctx.fillText(String(result.score), rx, 470);

      ctx.fillStyle = '#8C9C93';
      ctx.font = '400 14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(new Date().toLocaleDateString('tr-TR'), 450, 560);

      setCertDataUrl(canvas.toDataURL('image/png'));
    };
    img.src = imageDataUrl;
  }

  return (
    <>
      <Head>
        <title>Kupon Ligi</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      <div className="wrap">
        <div className="hero">
          <h1>KUPON <span>LİGİ</span></h1>
          <p>Kuponunu yükle, oranına ve maç sayısına göre puanla, ligdeki yerini gör.</p>
        </div>

        <div className="panel">
          <p className="panel-title">KUPONUNU GÖNDER</p>

          <div className="field">
            <label>Rumuzun</label>
            <input type="text" value={nickname} onChange={e => setNickname(e.target.value)} maxLength={24} placeholder="Ligde görünecek isim" />
          </div>

          <div className="field">
            <label>Kupon ekran görüntüsü</label>
            <div className="dropzone" onClick={() => document.getElementById('fileInput').click()}>
              <div className="dropzone-text">{imageDataUrl ? 'Görsel seçildi ✓' : 'Görsel seçmek için tıkla'}</div>
              {imageDataUrl && <img className="preview" src={imageDataUrl} alt="önizleme" />}
              <input id="fileInput" type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => handleFile(e.target.files[0])} />
            </div>
          </div>

          <button className="primary" onClick={analyze} disabled={loading}>
            {loading ? 'Analiz ediliyor…' : 'Kuponu Analiz Et'}
          </button>
          {status.text && <div className={`status ${status.kind}`}>{status.text}</div>}

          {result && result.valid && (
            <div className="result">
              <div className="rank-badge">
                {result.won ? `LİGDEKİ SIRAN: #${result.rank}` : 'SIRALAMAYA GİREMEDİ'}
              </div>
              <div className="result-grid">
                <div className="stat"><div className="k">Toplam Oran</div><div className="v">{result.odds.toFixed(2)}</div></div>
                <div className="stat"><div className="k">Maç Sayısı</div><div className="v">{result.matches}</div></div>
                <div className="stat score"><div className="k">Puan</div><div className="v">{result.score}</div></div>
                <div className="stat"><div className="k">Durum</div><div className="v" style={{ fontSize: '1.1rem' }}>
                  {result.durum === 'kazandi' ? 'Kazandı ✓' : result.durum === 'kaybetti' ? 'Kaybetti' : 'Belirsiz'}
                </div></div>
              </div>
              {result.won && (
                <>
                  <button className="secondary" onClick={showCertificate}>Sertifikayı Göster</button>
                  {certDataUrl && (
                    <div style={{ marginTop: '14px' }}>
                      <img src={certDataUrl} alt="sertifika" style={{ width: '100%', borderRadius: '4px', border: '1px solid var(--chalk-line)' }} />
                      <div style={{ fontSize: '0.8rem', color: 'var(--chalk)', marginTop: '8px', textAlign: 'center' }}>
                        Görsele sağ tıklayıp (mobilde uzun basıp) &quot;Resmi kaydet&quot; ile indirebilirsin.
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="panel">
          <p className="panel-title">SKOR TABLOSU</p>
          {board.length === 0 ? (
            <div className="empty">Henüz kupon yok. İlk sırayı sen al.</div>
          ) : (
            board.map((e, i) => (
              <div className={`board-row ${i === 0 ? 'top1' : ''}`} key={i}>
                <div className="rank">{i + 1}</div>
                <div>
                  <div className="name">{e.nickname}</div>
                  <div className="meta">{Number(e.odds).toFixed(2)} oran · {e.matches} maç</div>
                </div>
                <div className="pts">{e.score}</div>
              </div>
            ))
          )}
        </div>

        <div className="note">
          Puanlama eğlence amaçlıdır, gerçek bahis sonucu garantisi vermez.
        </div>
      </div>

      <style jsx global>{`
        :root{
          --pitch:#0B3D2E; --navy:#0A1128; --floodlight:#F4F1E8;
          --amber:#FFB627; --chalk:#8C9C93; --chalk-line:#2A4A3D;
          --loss:#D96C63; --win:#6FCF87; --radius:6px;
        }
        *{box-sizing:border-box;}
        body{margin:0;background:var(--navy);color:var(--floodlight);font-family:'Inter',sans-serif;}
        .wrap{max-width:720px;margin:0 auto;padding:32px 20px 80px;}
        .hero{text-align:center;padding:36px 0 28px;}
        .hero h1{font-family:'Anton',sans-serif;font-weight:400;font-size:clamp(2.4rem,8vw,3.6rem);margin:0 0 8px;}
        .hero h1 span{color:var(--amber);}
        .hero p{color:var(--chalk);margin:0;font-size:1rem;max-width:440px;margin:0 auto;}
        .panel{background:var(--pitch);border:1px solid var(--chalk-line);border-radius:var(--radius);padding:24px;margin-top:20px;}
        .panel-title{font-family:'Anton',sans-serif;font-weight:400;font-size:1.1rem;margin:0 0 16px;color:var(--amber);}
        .field{margin-bottom:14px;}
        .field label{display:block;font-size:0.85rem;color:var(--chalk);margin-bottom:6px;}
        .field input[type=text]{width:100%;padding:11px 12px;background:var(--navy);border:1px solid var(--chalk-line);border-radius:4px;color:var(--floodlight);font-size:0.95rem;}
        .dropzone{border:2px dashed var(--chalk-line);border-radius:4px;padding:22px;text-align:center;cursor:pointer;}
        .dropzone:hover{border-color:var(--amber);}
        .dropzone-text{color:var(--chalk);font-size:0.9rem;}
        .preview{max-width:100%;max-height:220px;border-radius:4px;margin-top:12px;}
        button.primary{width:100%;margin-top:14px;padding:13px;background:var(--amber);color:var(--navy);border:none;border-radius:4px;font-weight:700;font-size:0.95rem;cursor:pointer;}
        button.primary:disabled{opacity:0.5;cursor:not-allowed;}
        button.secondary{width:100%;margin-top:10px;padding:12px;background:transparent;color:var(--floodlight);border:1px solid var(--chalk-line);border-radius:4px;font-weight:600;font-size:0.9rem;cursor:pointer;}
        button.secondary:hover{border-color:var(--amber);color:var(--amber);}
        .status{font-size:0.88rem;color:var(--chalk);margin-top:10px;}
        .status.err{color:var(--loss);} .status.ok{color:var(--win);}
        .result-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0;}
        .stat{background:var(--navy);border:1px solid var(--chalk-line);border-radius:4px;padding:12px;}
        .stat .k{font-size:0.75rem;color:var(--chalk);margin-bottom:4px;}
        .stat .v{font-family:'Anton',sans-serif;font-size:1.5rem;font-variant-numeric:tabular-nums;}
        .stat.score .v{color:var(--amber);}
        .rank-badge{display:inline-block;background:var(--amber);color:var(--navy);font-family:'Anton',sans-serif;font-size:0.85rem;padding:4px 10px;border-radius:3px;margin-bottom:10px;}
        .board-row{display:grid;grid-template-columns:40px 1fr auto auto;gap:12px;align-items:center;padding:12px 4px;border-bottom:1px solid var(--chalk-line);}
        .board-row:last-child{border-bottom:none;}
        .board-row .rank{font-family:'Anton',sans-serif;font-size:1.3rem;color:var(--amber);text-align:center;}
        .board-row .name{font-weight:600;font-size:0.95rem;}
        .board-row .meta{font-size:0.78rem;color:var(--chalk);}
        .board-row .pts{font-family:'Anton',sans-serif;font-size:1.15rem;text-align:right;}
        .board-row.top1 .rank{color:var(--win);}
        .empty{color:var(--chalk);font-size:0.9rem;text-align:center;padding:20px 0;}
        .note{margin-top:28px;font-size:0.78rem;color:var(--chalk);text-align:center;border-top:1px solid var(--chalk-line);padding-top:16px;}
      `}</style>
    </>
  );
}
