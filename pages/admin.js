import { useState } from 'react';
import Head from 'next/head';

export default function Admin() {
  const [password, setPassword] = useState('');
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState('');

  async function loadStats() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { 'x-admin-password': password }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setStats(data);
    } catch (err) {
      setError(err.message);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }

  async function resetData() {
    if (!confirm('This will permanently delete ALL submissions, leaderboard entries, winners, and reactions. This cannot be undone. Continue?')) return;
    setResetMsg('Resetting…');
    try {
      const res = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: { 'x-admin-password': password }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset');
      setResetMsg('All data cleared.');
      loadStats();
    } catch (err) {
      setResetMsg('Error: ' + err.message);
    }
  }

  const maxDaily = stats ? Math.max(1, ...Object.values(stats.dailyCounts)) : 1;
  const sortedDays = stats ? Object.keys(stats.dailyCounts).sort() : [];

  return (
    <>
      <Head><title>Admin — Coupon League</title></Head>
      <div className="wrap">
        <h1>Coupon League — Admin</h1>

        <div className="login">
          <input
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && loadStats()}
          />
          <button onClick={loadStats} disabled={loading}>{loading ? 'Loading…' : 'View Stats'}</button>
        </div>
        {error && <div className="error">{error}</div>}

        {stats && (
          <>
            <div className="reset-box">
              <button className="reset-btn" onClick={resetData}>Reset All Data</button>
              {resetMsg && <span className="reset-msg">{resetMsg}</span>}
            </div>

            <div className="grid">
              <div className="card"><div className="num">{stats.totalAttempts}</div><div className="label">Total Submissions</div></div>
              <div className="card"><div className="num">{stats.uniqueUsers}</div><div className="label">Unique Users</div></div>
              <div className="card"><div className="num">{stats.totalWins}</div><div className="label">Winning Slips</div></div>
              <div className="card"><div className="num">%{stats.winRate}</div><div className="label">Win Rate</div></div>
              <div className="card"><div className="num">👍 {stats.reactions.up} / 👎 {stats.reactions.down}</div><div className="label">Reactions</div></div>
            </div>

            <h2>Last 14 Days</h2>
            <div className="chart">
              {sortedDays.length === 0 && <div className="muted">No data yet.</div>}
              {sortedDays.map(day => (
                <div className="bar-col" key={day}>
                  <div className="bar" style={{ height: `${(stats.dailyCounts[day] / maxDaily) * 100}%` }} title={`${day}: ${stats.dailyCounts[day]}`} />
                  <div className="bar-label">{day.slice(5)}</div>
                </div>
              ))}
            </div>

            <h2>Top 5 Scores</h2>
            <table>
              <thead><tr><th>Nickname</th><th>Score</th><th>Odds</th><th>Matches</th><th>Date</th></tr></thead>
              <tbody>
                {stats.topScores.map((s, i) => (
                  <tr key={i}>
                    <td>{s.nickname}</td>
                    <td>{s.score}</td>
                    <td>{Number(s.odds).toFixed(2)}</td>
                    <td>{s.matches}</td>
                    <td>{new Date(s.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      <style jsx global>{`
        body { margin: 0; background: #0A1128; color: #F4F1E8; font-family: Inter, sans-serif; }
        .wrap { max-width: 720px; margin: 0 auto; padding: 32px 20px; }
        h1 { font-size: 1.6rem; }
        .login { display: flex; gap: 8px; margin: 20px 0; }
        .login input { flex: 1; padding: 10px; background: #0B3D2E; border: 1px solid #2A4A3D; border-radius: 4px; color: #F4F1E8; }
        .login button { padding: 10px 16px; background: #FFB627; color: #0A1128; border: none; border-radius: 4px; font-weight: 700; cursor: pointer; }
        .error { color: #D96C63; margin-bottom: 16px; }
        .reset-box { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
        .reset-btn { padding: 8px 14px; background: transparent; border: 1px solid #D96C63; color: #D96C63; border-radius: 4px; font-weight: 600; cursor: pointer; font-size: 0.85rem; }
        .reset-btn:hover { background: #D96C63; color: #0A1128; }
        .reset-msg { font-size: 0.85rem; color: #8C9C93; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; margin: 20px 0; }
        .card { background: #0B3D2E; border: 1px solid #2A4A3D; border-radius: 6px; padding: 16px; text-align: center; }
        .num { font-size: 1.5rem; font-weight: 700; color: #FFB627; }
        .label { font-size: 0.8rem; color: #8C9C93; margin-top: 4px; }
        h2 { font-size: 1.1rem; margin-top: 32px; color: #FFB627; }
        .chart { display: flex; gap: 6px; align-items: flex-end; height: 140px; border-bottom: 1px solid #2A4A3D; padding-top: 10px; }
        .bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; }
        .bar { width: 100%; background: #FFB627; border-radius: 2px 2px 0 0; min-height: 2px; }
        .bar-label { font-size: 0.65rem; color: #8C9C93; margin-top: 4px; }
        .muted { color: #8C9C93; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { text-align: left; padding: 8px; border-bottom: 1px solid #2A4A3D; font-size: 0.9rem; }
        th { color: #8C9C93; font-weight: 600; }
      `}</style>
    </>
  );
}
