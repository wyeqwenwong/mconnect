import { useEffect, useState } from 'react';
import { asset } from '../../lib/assets';
import { store, subscribe } from '../../lib/store';
import { sfx } from '../../lib/sound';
import type { LeaderboardRow } from '../../lib/types';

// Podium positions inside the 1372px-tall colorbar (ref 3a Top 5).
// left→right visual order is ranks 4,2,1,3,5.
const POS: Record<number, { left: string; nameTop: number; digitTop: number }> = {
  1: { left: '50%', nameTop: -64, digitTop: 60 },
  2: { left: '31%', nameTop: 76, digitTop: 196 },
  3: { left: '69%', nameTop: 139, digitTop: 259 },
  4: { left: '13%', nameTop: 212, digitTop: 330 },
  5: { left: '87%', nameTop: 249, digitTop: 369 },
};

// Placeholder leaders (design sample names) fill empty podium slots so a fresh
// board still shows a full Top 5. Real players always rank above them.
const FILLER_NAMES = ['Mikayla', 'Ashely', 'Bod', 'Fay', 'Olivia'];

type PodiumRow = { id: string; rank: number; name: string; placeholder: boolean };

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
  const podium: PodiumRow[] = [];
  for (let rank = 1; rank <= 5; rank++) {
    const real = top5[rank - 1];
    if (real) podium.push({ id: real.id, rank, name: real.name, placeholder: false });
    else podium.push({ id: `ph-${rank}`, rank, name: FILLER_NAMES[rank - 1], placeholder: true });
  }

  return (
    <div className="screen leaderboard">
      <img src={asset('leaderboard-bg.png')} className="bg" alt="" aria-hidden />
      <img src={asset('logo-white.png')} className="lb-logo" alt="Meta" />
      <div className="lb-top5">TOP 5{perfect && <span className="lb-perfect">Perfect speedrun +50</span>}</div>

      <div className="lb-podium">
        <img src={asset('colorbar.png')} className="lb-colorbar" alt="" aria-hidden />
        {podium.map((r) => {
          const pos = POS[r.rank];
          const mine = !r.placeholder && r.id === myRow?.id;
          return (
            <div key={r.id}>
              <div
                className={
                  'lb-name' + (mine ? ' lb-name--me' : '') + (r.placeholder ? ' lb-name--ph' : '')
                }
                style={{ left: pos.left, top: pos.nameTop }}
              >
                {r.name}
              </div>
              <div
                className={'lb-digit' + (r.placeholder ? ' lb-digit--ph' : '')}
                style={{ left: pos.left, top: pos.digitTop }}
              >
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
