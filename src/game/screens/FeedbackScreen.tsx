import { useEffect, useState } from 'react';
import { asset } from '../../lib/assets';
import { Leaves } from '../components/Leaves';
import { type Question, type QuestionResult } from '../../lib/types';

const CORRECT_ADVANCE_MS = 8000; // correct answers auto-advance; wrong wait for a tap

// Screen 3 — answer feedback (assetv2 Kiosk_v1_2). Green check (or cross),
// "Correct!/Not quite", points, running total pill, and a white reveal card.
export function FeedbackScreen({
  question,
  result,
  runningTotal,
  index,
  total,
  playerName,
  onDone,
}: {
  question: Question;
  result: QuestionResult;
  runningTotal: number;
  index: number;
  total: number;
  playerName: string;
  onDone: () => void;
}) {
  const correct = result.correct;
  const partial = !correct && result.fraction > 0;
  const title = correct ? 'Correct!' : partial ? 'Almost!' : 'Not quite';

  // Correct answers auto-advance after a delay; wrong/partial answers wait for
  // the player to tap Next so they have time to read the reveal. (The 45s idle
  // timeout still resets an abandoned kiosk.)
  const autoMs = correct ? CORRECT_ADVANCE_MS : 0;
  const [count, setCount] = useState(Math.ceil(autoMs / 1000));

  useEffect(() => {
    if (!autoMs) return;
    const iv = setInterval(() => setCount((c) => c - 1), 1000);
    const t = setTimeout(onDone, autoMs);
    return () => {
      clearInterval(iv);
      clearTimeout(t);
    };
  }, [onDone, autoMs]);

  const correctChoices = (question.choices ?? []).filter((c) => c.correct);
  // A fully-correct answer's base equals question.points, so anything extra is
  // the speed bonus.
  const speedBonus = correct ? Math.max(0, result.pointsEarned - question.points) : 0;

  return (
    <div className="screen v2 fb-v2">
      <img src={asset('bg-v2.png')} className="bg" alt="" aria-hidden />
      <Leaves />

      <header className="v2-head">
        <div className="v2-progress">
          {String(index + 1).padStart(2, '0')}/{String(total).padStart(2, '0')}
        </div>
        <img src={asset('meta-logo.png')} className="v2-logo" alt="Meta" />
        <div className="v2-chip">
          <svg className="v2-chip__ic" viewBox="0 0 24 24" aria-hidden>
            <path
              fill="#fff"
              d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2.2c-4.2 0-8 2.1-8 5.3v.5h16v-.5c0-3.2-3.8-5.3-8-5.3Z"
            />
          </svg>
          {playerName}
        </div>
      </header>

      <div className="fb2-body">
        {correct ? (
          <img src={asset('correct.png')} className="fb2-check" alt="Correct" />
        ) : (
          <div className={'fb2-cross' + (partial ? ' fb2-cross--partial' : '')}>✕</div>
        )}

        <div className="fb2-title">{title}</div>
        <div className="fb2-points">
          +{result.pointsEarned} point{result.pointsEarned === 1 ? '' : 's'}
        </div>
        {speedBonus > 0 && <div className="fb2-speed">⚡ includes +{speedBonus} speed bonus</div>}
        <div className="fb2-total">TOTAL {runningTotal} PTS</div>

        <div className="fb2-card">
          {!correct && correctChoices.length > 0 && (
            <div className="fb2-card__answer">
              {question.multi ? 'Answer: ' : 'Answer: '}
              {correctChoices.map((c) => c.label).join(', ')}
            </div>
          )}
          {question.explanation && <div className="fb2-card__reveal">{question.explanation}</div>}
        </div>
      </div>

      <div className="fb2-foot">
        <button className={'fb2-next' + (correct ? '' : ' fb2-next--primary')} onClick={onDone}>
          {index + 1 >= total ? 'See results' : 'Next question'}
          {autoMs ? ` · ${Math.max(count, 0)}s` : ' ›'}
        </button>
      </div>
    </div>
  );
}
