import { useEffect, useState } from 'react';
import { asset } from '../../lib/assets';
import { store, subscribe } from '../../lib/store';
import { sfx } from '../../lib/sound';
import type { LeaderboardRow } from '../../lib/types';

// Podium positions inside the colorbar (ref 3a Top 5). `left` values are the
// measured bar centers (% of width) so digits sit dead-centre at any size.
// left→right visual order is ranks 4,2,1,3,5.
const POS: Record<number, { left: string; nameTop: number; digitTop: number }> = {
  1: { left: '49.9%', nameTop: -108, digitTop: 60 },
  2: { left: '31.2%', nameTop: 30, digitTop: 196 },
  3: { left: '68.2%', nameTop: 93, digitTop: 259 },
  4: { left: '15%', nameTop: 166, digitTop: 330 },
  5: { left: '84.6%', nameTop: 203, digitTop: 369 },
};

// Placeholder leaders (design sample names) fill empty podium slots so a fresh
// board still shows a full Top 5. Real players always rank above them.
const FILLER_NAMES = ['Mikayla', 'Ashely', 'Bod', 'Fay', 'Olivia'];

type PodiumRow = { id: string; rank: number; name: string; placeholder: boolean; score: number };

// Screen 4 — Top 5 leaderboard (ref 3a). leaderboard-bg + colorbar podium.
export function LeaderboardScreen({
  playerName,
  finalTotal,
  perfect,
  onPlayAgain,
}: {
  playerName: string;
  finalTotal: number;
  perfect: boolean;
  onPlayAgain: () => void;
}) {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
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

  const top5 = rows.slice(0, 5);
  const myRow =
    rows.find((r) => r.name === playerName && r.total === finalTotal) ??
    rows.find((r) => r.name === playerName);
  const outsideTop5 = myRow && myRow.rank > 5;

  // Fill any empty podium slots with placeholder leaders (real players first).
  // Placeholder scores decay from the last real score so the board stays
  // believable and monotonic top→bottom.
  const podium: PodiumRow[] = [];
  let prevScore: number | null = null;
  for (let rank = 1; rank <= 5; rank++) {
    const real = top5[rank - 1];
    if (real) {
      podium.push({ id: real.id, rank, name: real.name, placeholder: false, score: real.total });
      prevScore = real.total;
    } else {
      const score = Math.max(0, Math.round((prevScore ?? 500) * 0.85));
      podium.push({ id: `ph-${rank}`, rank, name: FILLER_NAMES[rank - 1], placeholder: true, score });
      prevScore = score;
    }
  }

  return (
    <div className="screen leaderboard">
      <img src={asset('leaderboard-bg.png')} className="bg" alt="" aria-hidden />
      <img src={asset('logo-white.png')} className="lb-logo" alt="Meta" />
      <div className="lb-top5">TOP 5{perfect && <span className="lb-perfect">Perfect run! 🎉</span>}</div>

      <div className="lb-podium">
        <img src={asset('colorbar.png')} className="lb-colorbar" alt="" aria-hidden />
        {podium.map((r) => {
          const pos = POS[r.rank];
          return (
            <div key={r.id}>
              <div className="lb-name" style={{ left: pos.left, top: pos.nameTop }}>
                {r.name}
              </div>
              <div className="lb-podium-score" style={{ left: pos.left, top: pos.nameTop + 46 }}>
                {r.score} pts
              </div>
              <div className="lb-digit" style={{ left: pos.left, top: pos.digitTop }}>
                {r.rank}
              </div>
            </div>
          );
        })}
      </div>

      {outsideTop5 && myRow && (
        <div className="lb-you-banner">
          You’re #{myRow.rank} · {myRow.total} pts
        </div>
      )}

      <button className="lb-again" onClick={onPlayAgain}>
        Play again
      </button>
    </div>
  );
}
