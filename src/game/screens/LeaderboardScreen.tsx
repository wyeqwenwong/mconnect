import { useEffect, useState } from 'react';
import { asset } from '../../lib/assets';
import { store, subscribe } from '../../lib/store';
import { sfx } from '../../lib/sound';
import { Leaves } from '../components/Leaves';
import type { LeaderboardRow } from '../../lib/types';

// Placeholder leaders fill empty rows so a fresh board still looks full.
const FILLER_NAMES = ['Aina', 'Bod', 'Peter', 'Katie'];
const TOP_N = 4; // medals 1–4 (assetv2)

type Row = { id: string; rank: number; name: string; score: number; me: boolean };

// Screen 4 — results + Top players (assetv2 Kiosk_v1_2).
export function LeaderboardScreen({
  playerName,
  finalTotal,
  onPlayAgain,
}: {
  playerName: string;
  finalTotal: number;
  onPlayAgain: () => void;
}) {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [toast, setToast] = useState('');

  useEffect(() => {
    sfx.fanfare();
  }, []);

  useEffect(() => {
    let alive = true;
    const load = () => store.getLeaderboard(100).then((r) => alive && setRows(r));
    load();
    const unsub = subscribe('leaderboard', load);
    return () => {
      alive = false;
      unsub();
    };
  }, []);

  const myRow =
    rows.find((r) => r.name === playerName && r.total === finalTotal) ??
    rows.find((r) => r.name === playerName);

  // Build the Top-N list, filling any empty slots with decaying placeholders.
  const top: Row[] = [];
  let prev: number | null = null;
  for (let rank = 1; rank <= TOP_N; rank++) {
    const real = rows[rank - 1];
    if (real) {
      top.push({ id: real.id, rank, name: real.name, score: real.total, me: myRow?.id === real.id });
      prev = real.total;
    } else {
      const score = Math.max(0, Math.round((prev ?? 50) * 0.85));
      top.push({ id: `ph-${rank}`, rank, name: FILLER_NAMES[rank - 1], score, me: false });
      prev = score;
    }
  }

  const share = () => {
    sfx.tap();
    setToast('📸 Screenshot to share your score!');
    setTimeout(() => setToast(''), 2600);
  };

  return (
    <div className="screen v2 lb-v2">
      <img src={asset('bg-v2.png')} className="bg" alt="" aria-hidden />
      <Leaves />

      <img src={asset('meta-logo.png')} className="lb2-logo" alt="Meta" />

      <div className="lb2-score">{finalTotal}</div>
      <div className="lb2-score-label">
        {myRow ? `You placed #${myRow.rank}` : 'Your score'}
      </div>

      <div className="lb2-card">
        <div className="lb2-card__title">Top players</div>
        {top.map((r) => (
          <div className={'lb2-row' + (r.me ? ' lb2-row--me' : '')} key={r.id}>
            <img src={asset(`medal${r.rank}.png`)} className="lb2-medal" alt={`#${r.rank}`} />
            <span className="lb2-name">
              {r.name}
              {r.me && <span className="lb2-you">you</span>}
            </span>
            <span className="lb2-pts">{r.score}</span>
          </div>
        ))}
      </div>

      <div className="lb2-actions">
        <button className="lb2-share" onClick={share} aria-label="Share score">
          <img src={asset('share-score.png')} alt="Share score" />
        </button>
        <button className="lb2-again" onClick={onPlayAgain} aria-label="Play again">
          <img src={asset('play-again.png')} alt="Play again" />
        </button>
      </div>

      {toast && <div className="lb2-toast">{toast}</div>}
    </div>
  );
}
