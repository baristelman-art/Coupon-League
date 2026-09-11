import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';

const STATUS_LABEL = {
  kazandi: 'Won ✓',
  kaybetti: 'Lost',
  devam_ediyor: 'Live',
  oynanmadi: 'Not Placed'
};

export default function Home() {
  const [nickname, setNickname] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ text: '', kind: '' });
  const [result, setResult] = useState(null);
  const [board, setBoard] = useState([]);
  const [period, setPeriod] = useState('all');
  const [winners, setWinners] = useState({ daily: null, weekly: null, monthly: null });
  const [certDataUrl, setCertDataUrl] = useState(null);
  const [posterMode, setPosterMode] = useState(null); // 'winner' | 'fun'

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
    setCertDataUrl(null);
    setPosterMode(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageDataUrl, nickname })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Unknown error');

      if (data.valid === false) {
        setStatus({ text: "Couldn't read this as a real betting slip. Try a clearer screenshot.", kind: 'err' });
        return;
      }

      setResult(data);
      setStatus({ text: `You're ranked #${data.rank} on the leaderboard!`, kind: 'ok' });
      loadBoard(period);
    } catch (err) {
      setStatus({ text: 'Error: ' + err.message, kind: 'err' });
    } finally {
      setLoading(false);
    }
  }

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
  const liveLines = [
    "Still cooking. No peeking.",
    "The suspense is doing damage.",
    "Currently living in the odds.",
    "Ask again after the final whistle.",
    "In progress. Nerves: also in progress."
  ];
  const unplacedLines = [
    "Big dreams, zero dollars wagered.",
    "The safest bet is the one you never place.",
    "Window shopping, sportsbook edition.",
    "Confidence: 100%. Commitment: 0%.",
    "A parlay of pure potential."
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

  function drawTrophy(ctx, cx, cy, scale, color) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;
    // cup bowl
    ctx.beginPath();
    ctx.moveTo(-30, -40);
    ctx.quadraticCurveTo(-32, 10, 0, 14);
    ctx.quadraticCurveTo(32, 10, 30, -40);
    ctx.closePath();
    ctx.fill();
    // handles
    ctx.beginPath();
    ctx.arc(-38, -28, 12, Math.PI * 0.3, Math.PI * 1.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(38, -28, 12, Math.PI * 1.4, Math.PI * 2.7);
    ctx.stroke();
    // stem
    ctx.fillRect(-5, 14, 10, 18);
    // base
    ctx.beginPath();
    ctx.moveTo(-22, 32);
    ctx.lineTo(22, 32);
    ctx.lineTo(16, 44);
    ctx.lineTo(-16, 44);
    ctx.closePath();
    ctx.fill();
    // top rim highlight
    ctx.beginPath();
    ctx.ellipse(0, -40, 30, 8, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fill();
    ctx.restore();
  }

  function drawStar(ctx, cx, cy, r, color) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      ctx.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * r, -Math.sin((18 + i * 72) * Math.PI / 180) * r);
      ctx.lineTo(Math.cos((54 + i * 72) * Math.PI / 180) * r * 0.4, -Math.sin((54 + i * 72) * Math.PI / 180) * r * 0.4);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function showCertificate() {
    if (!result) return;
    setPosterMode('winner');
    const canvas = document.createElement('canvas');
    canvas.width = 900; canvas.height = 600;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0A1128';
    ctx.fillRect(0, 0, 900, 600);
    ctx.strokeStyle = '#FFB627';
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 16, 868, 568);

    drawStar(ctx, 70, 60, 10, 'rgba(255,182,39,0.5)');
    drawStar(ctx, 830, 60, 10, 'rgba(255,182,39,0.5)');
    drawStar(ctx, 70, 540, 10, 'rgba(255,182,39,0.5)');
    drawStar(ctx, 830, 540, 10, 'rgba(255,182,39,0.5)');

    ctx.fillStyle = '#F4F1E8';
    ctx.font = '700 30px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('COUPON LEAGUE CHAMPION', 450, 68);

    drawTrophy(ctx, 220, 260, 2.6, '#FFB627');

    const rx = 470;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#8C9C93';
    ctx.font = '600 16px Inter, sans-serif';
    ctx.fillText('NICKNAME', rx, 150);
    ctx.fillStyle = '#F4F1E8';
    ctx.font = '700 30px Inter, sans-serif';
    ctx.fillText(nickname, rx, 184);

    ctx.fillStyle = '#8C9C93';
    ctx.font = '600 16px Inter, sans-serif';
    ctx.fillText('TOTAL ODDS', rx, 250);
    ctx.fillStyle = '#F4F1E8';
    ctx.font = '700 30px Inter, sans-serif';
    ctx.fillText(result.odds.toFixed(2), rx, 284);

    ctx.fillStyle = '#8C9C93';
    ctx.font = '600 16px Inter, sans-serif';
    ctx.fillText('MATCHES', rx, 350);
    ctx.fillStyle = '#F4F1E8';
    ctx.font = '700 30px Inter, sans-serif';
    ctx.fillText(String(result.matches), rx, 384);

    ctx.fillStyle = '#8C9C93';
    ctx.font = '600 16px Inter, sans-serif';
    ctx.fillText('SCORE', rx, 450);
    ctx.fillStyle = '#FFB627';
    ctx.font = '700 60px Inter, sans-serif';
    ctx.fillText(String(result.score), rx, 502);

    ctx.fillStyle = '#8C9C93';
    ctx.font = '400 14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(new Date().toLocaleDateString('en-US') + '  ·  coupon-league.vercel.app', 450, 560);

    setCertDataUrl(canvas.toDataURL('image/png'));
  }

  function showFunnyPoster() {
    if (!result) return;
    setPosterMode('fun');

    let lines, stamp, bg, accent;
    if (result.durum === 'devam_ediyor') {
      lines = liveLines; stamp = 'LIVE'; bg = '#1B2A4A'; accent = '#6FA8DC';
    } else if (result.durum === 'oynanmadi') {
      lines = unplacedLines; stamp = 'ALMOST'; bg = '#3A2E1B'; accent = '#FFB627';
    } else if (result.won && result.rank > 1) {
      lines = runnerUpLines; stamp = 'SO CLOSE'; bg = '#0B3D2E'; accent = '#6FCF87';
    } else {
      lines = loserLines; stamp = 'NICE TRY'; bg = '#3A1620'; accent = '#D96C63';
    }
    const line = pickLine(lines);

    const canvas = document.createElement('canvas');
    canvas.width = 900; canvas.height = 600;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 900, 600);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 16, 868, 568);

    drawStar(ctx, 90, 500, 8, accent + '55'.length === 2 ? accent : accent);
    drawStar(ctx, 810, 90, 12, accent);
    drawStar(ctx, 70, 90, 8, accent);

    ctx.save();
    ctx.translate(740, 100);
    ctx.rotate(-0.25);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 5;
    ctx.strokeRect(-95, -28, 190, 56);
    ctx.fillStyle = accent;
    ctx.font = '700 22px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(stamp, 0, 8);
    ctx.restore();

    ctx.fillStyle = '#F4F1E8';
    ctx.font = '700 34px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('COUPON LEAGUE', 450, 68);

    drawTrophy(ctx, 220, 260, 2.2, accent + '' /* tinted */);

    const rx = 470;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#D8D2C2';
    ctx.font = '600 16px Inter, sans-serif';
    ctx.fillText('NICKNAME', rx, 150);
    ctx.fillStyle = '#F4F1E8';
    ctx.font = '700 30px Inter, sans-serif';
    ctx.fillText(nickname, rx, 184);

    ctx.fillStyle = '#D8D2C2';
    ctx.font = '600 16px Inter, sans-serif';
    ctx.fillText('SCORE', rx, 250);
    ctx.fillStyle = accent;
    ctx.font = '700 44px Inter, sans-serif';
    ctx.fillText(String(result.score), rx, 294);

    ctx.fillStyle = '#F4F1E8';
    ctx.font = 'italic 600 23px Inter, sans-serif';
    ctx.textAlign = 'left';
    wrapText(ctx, '"' + line + '"', rx, 350, 350, 30);

    ctx.fillStyle = '#8C9C93';
    ctx.font = '400 14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(new Date().toLocaleDateString('en-US') + '  ·  coupon-league.vercel.app', 450, 560);

    setCertDataUrl(canvas.toDataURL('image/png'));
  }

  async function sharePoster() {
    if (!certDataUrl) return;
    try {
      const blob = await (await fetch(certDataUrl)).blob();
      const file = new File([blob], 'coupon-league.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Coupon League', text: 'Check out my Coupon League result!' });
      } else {
        const a = document.createElement('a');
        a.href = certDataUrl;
        a.download = 'coupon-league.png';
        a.click();
      }
    } catch (e) {
      // user cancelled share or it failed — no-op
    }
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
              <div className="rank-badge">RANK #{result.rank}</div>
              <div className="result-grid">
                <div className="stat"><div className="k">Total Odds</div><div className="v">{result.odds.toFixed(2)}</div></div>
                <div className="stat"><div className="k">Matches</div><div className="v">{result.matches}</div></div>
                <div className="stat score"><div className="k">Score</div><div className="v">{result.score}</div></div>
                <div className="stat"><div className="k">Status</div><div className="v" style={{ fontSize: '1.1rem' }}>
                  {STATUS_LABEL[result.durum] || result.durum}
                </div></div>
              </div>

              {(result.won && result.rank === 1) ? (
                <button className="poster-btn winner" onClick={showCertificate}>🏆 Show My Champion Poster</button>
              ) : (
                <button className="poster-btn fun" onClick={showFunnyPoster}>🎉 Show My Poster</button>
              )}

              {certDataUrl && (
                <div style={{ marginTop: '14px' }}>
                  <img src={certDataUrl} alt="poster" style={{ width: '100%', borderRadius: '4px', border: '1px solid var(--chalk-line)' }} />
                  <button className="share-btn" onClick={sharePoster}>📤 Share / Save Poster</button>
                  <div style={{ fontSize: '0.78rem', color: 'var(--chalk)', marginTop: '6px', textAlign: 'center' }}>
                    Or right-click (long-press on mobile) the image to save it directly.
                  </div>
                  <ReactionButtons nickname={nickname} />
                </div>
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
                <div className={`status-tag st-${e.status || 'kazandi'}`}>{(STATUS_LABEL[e.status] || 'Won ✓').replace(' ✓', '')}</div>
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
        .poster-btn{width:100%;margin-top:16px;padding:16px;border:none;border-radius:6px;font-weight:800;font-size:1.05rem;cursor:pointer;letter-spacing:0.01em;box-shadow:0 4px 0 rgba(0,0,0,0.25);}
        .poster-btn.winner{background:var(--amber);color:var(--navy);}
        .poster-btn.fun{background:linear-gradient(135deg,var(--amber),#ff8a5c);color:var(--navy);}
        .poster-btn:active{transform:translateY(2px);box-shadow:0 2px 0 rgba(0,0,0,0.25);}
        .share-btn{width:100%;margin-top:10px;padding:11px;background:transparent;border:1px solid var(--amber);color:var(--amber);border-radius:4px;font-weight:700;font-size:0.9rem;cursor:pointer;}
        .share-btn:hover{background:var(--amber);color:var(--navy);}
        .status{font-size:0.88rem;color:var(--chalk);margin-top:10px;}
        .status.err{color:var(--loss);} .status.ok{color:var(--win);}
        .result-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0;}
        .stat{background:var(--navy);border:1px solid var(--chalk-line);border-radius:4px;padding:12px;}
        .stat .k{font-size:0.75rem;color:var(--chalk);margin-bottom:4px;}
        .stat .v{font-family:'Anton',sans-serif;font-size:1.5rem;font-variant-numeric:tabular-nums;}
        .stat.score .v{color:var(--amber);}
        .rank-badge{display:inline-block;background:var(--amber);color:var(--navy);font-family:'Anton',sans-serif;font-size:0.85rem;padding:4px 10px;border-radius:3px;margin-bottom:10px;}
        .board-row{display:grid;grid-template-columns:40px 1fr auto auto;gap:10px;align-items:center;padding:12px 4px;border-bottom:1px solid var(--chalk-line);}
        .board-row:last-child{border-bottom:none;}
        .board-row .rank{font-family:'Anton',sans-serif;font-size:1.3rem;color:var(--amber);text-align:center;}
        .board-row .name{font-weight:600;font-size:0.95rem;}
        .board-row .meta{font-size:0.78rem;color:var(--chalk);}
        .board-row .pts{font-family:'Anton',sans-serif;font-size:1.15rem;text-align:right;}
        .board-row.top1 .rank{color:var(--win);}
        .status-tag{font-size:0.68rem;font-weight:700;padding:3px 7px;border-radius:3px;text-align:center;white-space:nowrap;}
        .status-tag.st-kazandi{background:rgba(111,207,135,0.15);color:var(--win);}
        .status-tag.st-kaybetti{background:rgba(217,108,99,0.15);color:var(--loss);}
        .status-tag.st-devam_ediyor{background:rgba(111,168,220,0.15);color:#6FA8DC;}
        .status-tag.st-oynanmadi{background:rgba(255,182,39,0.15);color:var(--amber);}
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

function ReactionButtons({ nickname }) {
  const [sent, setSent] = useState(null);

  async function send(reaction) {
    if (sent) return;
    setSent(reaction);
    try {
      await fetch('/api/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, reaction })
      });
    } catch (e) {
      // fail silently, don't block the user experience
    }
  }

  if (sent) {
    return <div className="reaction-thanks">Thanks for the feedback! {sent === 'up' ? '👍' : '👎'}</div>;
  }

  return (
    <div className="reaction-row">
      <span className="reaction-prompt">Was this fun?</span>
      <button className="reaction-btn" onClick={() => send('up')}>👍</button>
      <button className="reaction-btn" onClick={() => send('down')}>👎</button>
      <style jsx>{`
        .reaction-row{display:flex;align-items:center;gap:10px;margin-top:14px;justify-content:center;}
        .reaction-prompt{font-size:0.82rem;color:var(--chalk);}
        .reaction-btn{background:var(--navy);border:1px solid var(--chalk-line);border-radius:4px;padding:6px 12px;font-size:1.1rem;cursor:pointer;}
        .reaction-btn:hover{border-color:var(--amber);}
        .reaction-thanks{margin-top:14px;text-align:center;font-size:0.85rem;color:var(--win);}
      `}</style>
    </div>
  );
}
