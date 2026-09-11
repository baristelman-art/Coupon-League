import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';

export default function Home() {
  const [nickname, setNickname] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ text: '', kind: '' });
  const [result, setResult] = useState(null);
  const [board, setBoard] = useState([]);
  const [period, setPeriod] = useState('all');
  const [winners, setWinners] = useState({ daily: null, weekly: null, monthly: null });

  const loadBoard = useCallback(async (p) => {
    try {
      const res = await fetch(`/api/leaderboard?limit=20&period=${p}`);
      const data = await res.json();
      setBoard(data.entries || []);
    } catch (e) {
      // fail silently, board stays as-is
    }
  }, []);

  const loadWinners = useCallback(async () => {
    try {
      const res = await fetch('/api/winners');
      const data = await res.json();
      setWinners(data);
    } catch (e) {
      // fail silently
    }
  }, []);

  useEffect(() => { loadBoard(period); }, [period, loadBoard]);
  useEffect(() => { loadWinners(); }, [loadWinners]);

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
    if (!nickname.trim()) { setStatus({ text: 'Enter a nickname first.', kind: 'err' }); return; }
    if (!imageDataUrl) { setStatus({ text: 'Select a slip image first.', kind: 'err' }); return; }

    setLoading(true);
    setStatus({ text: 'Analyzing slip…', kind: '' });
    setResult(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageDataUrl, nickname })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Unknown error');

      if (data.valid === false) {
        setStatus({ text: "This image doesn't look like a betting slip.", kind: 'err' });
        return;
      }

      setResult(data);
      if (data.won) {
        setStatus({ text: 'Your slip was added to the leaderboard.', kind: 'ok' });
        loadBoard(period);
      } else {
        setStatus({ text: 'Only winning slips make the leaderboard.', kind: 'err' });
      }
    } catch (err) {
      setStatus({ text: 'Error: ' + err.message, kind: 'err' });
    } finally {
      setLoading(false);
    }
  }

  const [certDataUrl, setCertDataUrl] = useState(null);
  const [posterMode, setPosterMode] = useState(null); // 'winner' | 'fun'

  const loserLines = [
    "Bold strategy. Very bold.",
    "The odds were never, ever in your favor.",
    "Somewhere, a bookmaker is smiling.",
    "10/10 confidence, 2/10 outcome.",
    "This slip deserves a moment of silence.",
    "Maybe fewer legs next time?",
    "A valiant effort. A very valiant effort.",
    "Your parlay had dreams. Big dreams."
  ];
  const runnerUpLines = [
    "So close, yet so far.",
    "The podium is closer than you think.",
    "Certified risk-taker. Respect.",
    "Not first place, but first place energy.",
    "The rankings fear you.",
    "On the board! Keep climbing.",
    "Solid slip. Solid effort.",
    "This one almost had it all."
  ];

  function pickLine(lines) {
    const idx = (Math.abs((result.score || 0) + (result.matches || 0) + nickname.length)) % lines.length;
    return lines[idx];
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let curY = y;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      if (ctx.measureText(testLine).width > maxWidth && n > 0) {
        ctx.fillText(line, x, curY);
        line = words[n] + ' ';
        curY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, curY);
  }

  function showCertificate() {
    if (!result || !imageDataUrl) return;
    setPosterMode('winner');
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
    ctx.fillText('COUPON LEAGUE CERTIFICATE', 450, 70);

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
      ctx.fillText('NICKNAME', rx, 150);
      ctx.fillStyle = '#F4F1E8';
      ctx.font = '700 28px Inter, sans-serif';
      ctx.fillText(nickname, rx, 182);

      ctx.fillStyle = '#8C9C93';
      ctx.font = '600 16px Inter, sans-serif';
      ctx.fillText('TOTAL ODDS', rx, 240);
      ctx.fillStyle = '#F4F1E8';
      ctx.font = '700 28px Inter, sans-serif';
      ctx.fillText(result.odds.toFixed(2), rx, 272);

      ctx.fillStyle = '#8C9C93';
      ctx.font = '600 16px Inter, sans-serif';
      ctx.fillText('MATCHES', rx, 330);
      ctx.fillStyle = '#F4F1E8';
      ctx.font = '700 28px Inter, sans-serif';
      ctx.fillText(String(result.matches), rx, 362);

      ctx.fillStyle = '#8C9C93';
      ctx.font = '600 16px Inter, sans-serif';
      ctx.fillText('SCORE', rx, 420);
      ctx.fillStyle = '#FFB627';
      ctx.font = '700 56px Inter, sans-serif';
      ctx.fillText(String(result.score), rx, 470);

      ctx.fillStyle = '#8C9C93';
      ctx.font = '400 14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(new Date().toLocaleDateString('en-US'), 450, 560);

      setCertDataUrl(canvas.toDataURL('image/png'));
    };
    img.src = imageDataUrl;
  }

  function showFunnyPoster() {
    if (!result || !imageDataUrl) return;
    setPosterMode('fun');
    const isRunnerUp = result.won && result.rank > 1;
    const line = pickLine(isRunnerUp ? runnerUpLines : loserLines);
    const stamp = isRunnerUp ? 'SO CLOSE' : 'NICE TRY';
    const bg = isRunnerUp ? '#0B3D2E' : '#3A1620';
    const accent = isRunnerUp ? '#6FCF87' : '#D96C63';

    const canvas = document.createElement('canvas');
    canvas.width = 900; canvas.height = 600;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 900, 600);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 16, 868, 568);

    ctx.save();
    ctx.translate(740, 100);
    ctx.rotate(-0.25);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 5;
    ctx.strokeRect(-90, -28, 180, 56);
    ctx.fillStyle = accent;
    ctx.font = '700 22px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(stamp, 0, 8);
    ctx.restore();

    ctx.fillStyle = '#F4F1E8';
    ctx.font = '700 32px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('COUPON LEAGUE', 450, 65);

    const img = new Image();
    img.onload = () => {
      const boxW = 380, boxH = 380, boxX = 50, boxY = 110;
      const scale = Math.min(boxW / img.width, boxH / img.height);
      const dw = img.width * scale, dh = img.height * scale;
      ctx.strokeStyle = accent;
      ctx.strokeRect(boxX - 4, boxY - 4, boxW + 8, boxH + 8);
      ctx.drawImage(img, boxX + (boxW - dw) / 2, boxY + (boxH - dh) / 2, dw, dh);

      const rx = 480;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#D8D2C2';
      ctx.font = '600 16px Inter, sans-serif';
      ctx.fillText('NICKNAME', rx, 150);
      ctx.fillStyle = '#F4F1E8';
      ctx.font = '700 28px Inter, sans-serif';
      ctx.fillText(nickname, rx, 182);

      ctx.fillStyle = '#D8D2C2';
      ctx.font = '600 16px Inter, sans-serif';
      ctx.fillText('SCORE', rx, 240);
      ctx.fillStyle = accent;
      ctx.font = '700 40px Inter, sans-serif';
      ctx.fillText(String(result.score), rx, 280);

      ctx.fillStyle = '#F4F1E8';
      ctx.font = 'italic 600 22px Inter, sans-serif';
      ctx.textAlign = 'left';
      wrapText(ctx, '"' + line + '"', rx, 340, 340, 30);

      ctx.fillStyle = '#8C9C93';
      ctx.font = '400 14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(new Date().toLocaleDateString('en-US'), 450, 560);

      setCertDataUrl(canvas.toDataURL('image/png'));
    };
    img.src = imageDataUrl;
  }

  return (
    <>
      <Head>
        <title>Coupon League</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      <div className="wrap">
        <div className="hero">
          <h1>COUPON <span>LEAGUE</span></h1>
          <p>Upload your slip, get scored by odds and match count, and see your place in the league.</p>
        </div>

        <div className="panel">
          <p className="panel-title">SUBMIT YOUR SLIP</p>

          <div className="field">
            <label>Your nickname</label>
            <input type="text" value={nickname} onChange={e => setNickname(e.target.value)} maxLength={24} placeholder="Name shown on the leaderboard" />
          </div>

          <div className="field">
            <label>Slip screenshot</label>
            <div className="dropzone" onClick={() => document.getElementById('fileInput').click()}>
              <div className="dropzone-text">{imageDataUrl ? 'Image selected ✓' : 'Click to choose an image'}</div>
              {imageDataUrl && <img className="preview" src={imageDataUrl} alt="preview" />}
              <input id="fileInput" type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => handleFile(e.target.files[0])} />
            </div>
          </div>

          <button className="primary" onClick={analyze} disabled={loading}>
            {loading ? 'Analyzing…' : 'Analyze Slip'}
          </button>
          {status.text && <div className={`status ${status.kind}`}>{status.text}</div>}

          {result && result.valid && (
            <div className="result">
              <div className="rank-badge">
                {result.won ? `YOUR RANK: #${result.rank}` : 'DID NOT QUALIFY'}
              </div>
              <div className="result-grid">
                <div className="stat"><div className="k">Total Odds</div><div className="v">{result.odds.toFixed(2)}</div></div>
                <div className="stat"><div className="k">Matches</div><div className="v">{result.matches}</div></div>
                <div className="stat score"><div className="k">Score</div><div className="v">{result.score}</div></div>
                <div className="stat"><div className="k">Status</div><div className="v" style={{ fontSize: '1.1rem' }}>
                  {result.durum === 'kazandi' ? 'Won ✓' : result.durum === 'kaybetti' ? 'Lost' : 'Unclear'}
                </div></div>
              </div>
              {(result.won && result.rank === 1) ? (
                <>
                  <button className="secondary" onClick={showCertificate}>Show Certificate</button>
                  {posterMode === 'winner' && certDataUrl && (
                    <div style={{ marginTop: '14px' }}>
                      <img src={certDataUrl} alt="certificate" style={{ width: '100%', borderRadius: '4px', border: '1px solid var(--chalk-line)' }} />
                      <div style={{ fontSize: '0.8rem', color: 'var(--chalk)', marginTop: '8px', textAlign: 'center' }}>
                        Right-click (or long-press on mobile) the image and choose &quot;Save image&quot; to download it.
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <button className="secondary" onClick={showFunnyPoster}>Show Fun Poster</button>
                  {posterMode === 'fun' && certDataUrl && (
                    <div style={{ marginTop: '14px' }}>
                      <img src={certDataUrl} alt="poster" style={{ width: '100%', borderRadius: '4px', border: '1px solid var(--chalk-line)' }} />
                      <div style={{ fontSize: '0.8rem', color: 'var(--chalk)', marginTop: '8px', textAlign: 'center' }}>
                        Right-click (or long-press on mobile) the image and choose &quot;Save image&quot; to download it.
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="panel">
          <p className="panel-title">LEADERBOARD</p>
          <div className="tabs">
            {[['all', 'All-time'], ['daily', 'Today'], ['weekly', 'This Week'], ['monthly', 'This Month']].map(([key, label]) => (
              <button key={key} className={`tab ${period === key ? 'active' : ''}`} onClick={() => setPeriod(key)}>
                {label}
              </button>
            ))}
          </div>
          {board.length === 0 ? (
            <div className="empty">No slips yet. Take the top spot.</div>
          ) : (
            board.map((e, i) => (
              <div className={`board-row ${i === 0 ? 'top1' : ''}`} key={i}>
                <div className="rank">{i + 1}</div>
                <div>
                  <div className="name">{e.nickname}</div>
                  <div className="meta">{Number(e.odds).toFixed(2)} odds · {e.matches} matches</div>
                </div>
                <div className="pts">{e.score}</div>
              </div>
            ))
          )}
        </div>

        <div className="panel">
          <p className="panel-title">PAST WINNERS</p>
          {[['daily', 'Yesterday'], ['weekly', 'Last Week'], ['monthly', 'Last Month']].map(([key, label]) => (
            <div className="winner-row" key={key}>
              <div className="winner-label">{label}</div>
              {winners[key] ? (
                <div className="winner-info">
                  <span className="winner-name">{winners[key].nickname}</span>
                  <span className="winner-score">{winners[key].score} pts</span>
                </div>
              ) : (
                <span className="winner-info empty-inline">Not determined yet</span>
              )}
            </div>
          ))}
        </div>

        <div className="note">
          Scoring is for entertainment purposes only and is not a guarantee of any betting outcome.
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
        .tabs{display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;}
        .tab{padding:7px 12px;background:var(--navy);border:1px solid var(--chalk-line);border-radius:4px;color:var(--chalk);font-size:0.8rem;font-weight:600;cursor:pointer;}
        .tab.active{background:var(--amber);color:var(--navy);border-color:var(--amber);}
        .winner-row{display:flex;justify-content:space-between;align-items:center;padding:10px 4px;border-bottom:1px solid var(--chalk-line);}
        .winner-row:last-child{border-bottom:none;}
        .winner-label{font-size:0.85rem;color:var(--chalk);}
        .winner-info{display:flex;gap:10px;align-items:baseline;}
        .winner-name{font-weight:700;font-size:0.95rem;}
        .winner-score{font-family:'Anton',sans-serif;color:var(--amber);font-size:1rem;}
        .empty-inline{color:var(--chalk);font-size:0.85rem;font-style:italic;}
        .note{margin-top:28px;font-size:0.78rem;color:var(--chalk);text-align:center;border-top:1px solid var(--chalk-line);padding-top:16px;}
      `}</style>
    </>
  );
}
