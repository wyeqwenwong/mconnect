import { useEffect, useState } from 'react';
import { store, subscribe } from '../lib/store';
import type { LeaderboardRow } from '../lib/types';

export function LeaderboardView() {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);

  useEffect(() => {
    const load = () => store.getLeaderboard(200).then(setRows);
    load();
    const unsub = subscribe('leaderboard', load);
    return unsub;
  }, []);

  return (
    <div className="lbv">
      <h1 className="section-title">
        Leaderboard <span className="section-sub">{rows.length} players</span>
      </h1>

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
