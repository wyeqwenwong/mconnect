import { useEffect, useState } from 'react';
import { store, subscribe } from '../lib/store';
import { downloadFile, resultsToCsv, resultsToJson, stamp } from '../lib/exportResults';
import type { LeaderboardRow } from '../lib/types';

export function LeaderboardView() {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [busy, setBusy] = useState<'' | 'csv' | 'json'>('');
  const [err, setErr] = useState('');

  useEffect(() => {
    const load = () => store.getLeaderboard(200).then(setRows);
    load();
    const unsub = subscribe('leaderboard', load);
    return unsub;
  }, []);

  async function exportAs(kind: 'csv' | 'json') {
    setErr('');
    setBusy(kind);
    try {
      const results = await store.getAllResults();
      if (results.length === 0) {
        setErr('No results to export yet.');
        return;
      }
      if (kind === 'csv') {
        downloadFile(`connect-convert-results-${stamp()}.csv`, resultsToCsv(results), 'text/csv;charset=utf-8');
      } else {
        downloadFile(`connect-convert-results-${stamp()}.json`, resultsToJson(results), 'application/json');
      }
    } catch (e) {
      setErr('Export failed: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="lbv">
      <h1 className="section-title">
        Leaderboard <span className="section-sub">{rows.length} players</span>
      </h1>

      <div className="lbv__toolbar">
        <span className="lbv__toolbar-label">Export all results (name, score, timing &amp; per-question breakdown):</span>
        <button className="btn-export" onClick={() => exportAs('csv')} disabled={busy !== ''}>
          {busy === 'csv' ? 'Exporting…' : '⬇ Export CSV'}
        </button>
        <button className="btn-export btn-export--ghost" onClick={() => exportAs('json')} disabled={busy !== ''}>
          {busy === 'json' ? 'Exporting…' : '⬇ Export JSON'}
        </button>
      </div>
      {err && <div className="lbv__error">{err}</div>}

      <div className="table">
        <div className="table__head table__row lbv__row">
          <span>RANK</span>
          <span>PLAYER</span>
          <span>SCORE</span>
        </div>
        {rows.map((r) => (
          <div className="table__row lbv__row" key={r.id}>
            <span className={'lbv__rank rank-' + (r.rank <= 3 ? r.rank : 'n')}>#{r.rank}</span>
            <span>{r.name}</span>
            <span className="lbv__score">{r.total}</span>
          </div>
        ))}
        {rows.length === 0 && <div className="table__empty">No scores yet.</div>}
      </div>
    </div>
  );
}
