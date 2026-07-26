import { useEffect, useState } from 'react';
import { asset } from '../../lib/assets';
import { Dot, Pacman, Blob } from '../components/Decor';
import { type Question, type QuestionResult } from '../../lib/types';

const AUTO_ADVANCE_MS = 4000;

// Screen 3 — score feedback (ref 3a Score). bg2 + confetti ticks; big blue
// +score; amber TOTAL pill (live); NEXT button. Handles quiz + match results.
export function FeedbackScreen({
  question,
  result,
  runningTotal,
  showPoints,
  playerName,
  onDone,
}: {
  question: Question;
  result: QuestionResult;
  runningTotal: number;
  showPoints: boolean;
  playerName: string;
  onDone: () => void;
}) {
  const [count, setCount] = useState(Math.round(AUTO_ADVANCE_MS / 1000));

  useEffect(() => {
    const iv = setInterval(() => setCount((c) => c - 1), 1000);
    const t = setTimeout(onDone, AUTO_ADVANCE_MS);
    return () => {
      clearInterval(iv);
      clearTimeout(t);
    };
  }, [onDone]);

  const correct = result.correct;
  const partial = !correct && result.fraction > 0;
  const isMatch = question.kind === 'match';

  let sub: string;
  if (isMatch) {
    sub = correct ? 'all matched — nice one!' : `${result.correctCount ?? 0} of ${result.totalCount ?? 0} matched`;
  } else if (correct) {
    sub = 'points – nice one!';
  } else if (partial) {
    sub = `${result.correctCount ?? 0} of ${result.totalCount ?? 0} correct`;
  } else {
    sub = 'not quite!';
  }

  // Quiz reveal of the correct answer(s) when wrong.
  const correctChoices = (question.choices ?? []).filter((c) => c.correct);

  return (
    <div className="screen feedback">
      <img src={asset('bg2.png')} className="bg" alt="" aria-hidden />
      <img src={asset('tick-pink.png')} className="decor" style={{ top: 400, left: 110, width: 110 }} alt="" aria-hidden />
      <img src={asset('tick-purple.png')} className="decor" style={{ top: 280, right: 170, width: 100 }} alt="" aria-hidden />
      <img src={asset('tick-green.png')} className="decor" style={{ top: 700, right: 120, width: 120 }} alt="" aria-hidden />
      <Pacman style={{ top: 1200, left: 110, width: 90 }} />
      <Dot style={{ bottom: 250, right: 110, width: 170 }} />
      <Dot style={{ top: 1030, left: 100, width: 170 }} />
      <Blob color="var(--pink)" face="• ‿ •" style={{ top: 1120, right: 150, width: 100, height: 76, borderRadius: '60% 40% 55% 45%', color: '#222' }} />

      <header className="c-head c-head--full">
        <img src={asset('logo.png')} className="c-logo" alt="Meta" />
        <div className="c-chip">👤 {playerName}</div>
      </header>

      <div className="fb-body">
        {showPoints ? (
          <div className={'fb-score ' + (correct ? 'txt-blue' : partial ? 'txt-amber' : 'txt-magenta')}>
            +{result.pointsEarned}
          </div>
        ) : (
          <div className={'fb-mark ' + (correct ? 'fb-mark--ok' : 'fb-mark--no')}>{correct ? '✓' : '✕'}</div>
        )}
        <div className="fb-sub">{sub}</div>

        {showPoints && (
          <div className="fb-total-pill">TOTAL {runningTotal} PTS</div>
        )}

        {!isMatch && !correct && (
          <div className="fb-reveal">
            Answer: {correctChoices.map((c) => c.label).join(', ')}
          </div>
        )}
        {!isMatch && correct && question.explanation && (
          <div className="fb-reveal">{question.explanation}</div>
        )}

        <button className="fb-next" onClick={onDone} aria-label="Next">
          <img src={asset('next.png')} alt="Next" />
        </button>
        <div className="fb-count">Next in {Math.max(count, 0)}…</div>
      </div>
    </div>
  );
}
