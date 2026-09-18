import { useEffect, useRef, useState } from 'react';
import { asset } from '../../lib/assets';
import { Leaves } from '../components/Leaves';
import { scoreQuiz } from '../../lib/scoring';
import { sfx, duckMusic, unduckMusic } from '../../lib/sound';
import { TIME_PER_QUESTION_MS, type GameSettings, type Question, type QuestionResult } from '../../lib/types';

const TICK_MS = 100;
// Accent colors for the option badges (cycled A,B,C,…), matching the lively
// multi-colored icons in the Kiosk_v1_2 mockup.
const BADGE_COLORS = ['#F6A5C0', '#9B6DFF', '#FF4D8D', '#FDB60B', '#25D366', '#4A90F8'];
const RING_R = 92;
const RING_C = 2 * Math.PI * RING_R;

// Screen 2 — quiz question (assetv2 Kiosk_v1_2). Circular countdown ring,
// question text, tappable option pills. Single-select locks on tap; multi-select
// toggles with a submit button.
export function QuestionScreen({
  question,
  index,
  total,
  playerName,
  settings,
  onAnswered,
}: {
  question: Question;
  index: number;
  total: number;
  playerName: string;
  settings: GameSettings;
  onAnswered: (r: QuestionResult) => void;
}) {
  const choices = question.choices ?? [];
  const [selected, setSelected] = useState<string[]>([]);
  const [remaining, setRemaining] = useState(TIME_PER_QUESTION_MS);
  const startRef = useRef(Date.now());
  const doneRef = useRef(false);
  const selectedRef = useRef<string[]>([]);
  selectedRef.current = selected;

  const correctCount = choices.filter((c) => c.correct).length;

  function submit(ids: string[]) {
    if (doneRef.current) return;
    doneRef.current = true;
    unduckMusic();
    const timeTaken = Date.now() - startRef.current;
    const result = scoreQuiz(question, ids, timeTaken, settings);
    if (result.correct) sfx.correct();
    else sfx.wrong();
    onAnswered(result);
  }

  useEffect(() => {
    startRef.current = Date.now();
    doneRef.current = false;
    let lastSec = Infinity;
    const iv = setInterval(() => {
      const rem = Math.max(0, TIME_PER_QUESTION_MS - (Date.now() - startRef.current));
      setRemaining(rem);
      const sec = Math.ceil(rem / 1000);
      if (sec <= 10 && sec > 0 && sec !== lastSec) {
        if (sec === 10) {
          sfx.warn();
          duckMusic();
        }
        lastSec = sec;
        sfx.countdown(sec);
      }
      if (rem <= 0) {
        clearInterval(iv);
        if (!doneRef.current) {
          sfx.timeup();
          submit(question.multi ? selectedRef.current : []);
        }
      }
    }, TICK_MS);
    return () => {
      clearInterval(iv);
      unduckMusic();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id]);

  function toggle(choiceId: string) {
    if (doneRef.current) return;
    sfx.tap();
    if (question.multi) {
      setSelected((prev) =>
        prev.includes(choiceId) ? prev.filter((id) => id !== choiceId) : [...prev, choiceId],
      );
    } else {
      setSelected([choiceId]);
      setTimeout(() => submit([choiceId]), 260);
    }
  }

  const secLeft = Math.ceil(remaining / 1000);
  const progress = remaining / TIME_PER_QUESTION_MS;
  const low = secLeft <= 10;
  const ringColor = low ? '#FF4D4D' : 'var(--v2-green)'; // ring: green → red
  const numColor = low ? '#FF4D4D' : '#111111'; // number: black → red

  return (
    <div className={'screen v2 quiz-v2' + (question.multi ? ' quiz-v2--multi' : '')}>
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

      <div className={'q-timer' + (low ? ' q-timer--low' : '')}>
        <svg viewBox="0 0 220 220" className="q-timer__svg">
          <circle cx="110" cy="110" r={RING_R} fill="none" stroke="var(--v2-track)" strokeWidth="16" />
          <circle
            cx="110"
            cy="110"
            r={RING_R}
            fill="none"
            stroke={ringColor}
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={RING_C}
            strokeDashoffset={RING_C * (1 - progress)}
            transform="rotate(-90 110 110)"
          />
        </svg>
        <div className="q-timer__num" style={{ color: numColor }}>
          {secLeft}
        </div>
      </div>

      {settings.speedBonus && (
        <div className={'q-speed-hint' + (low ? ' q-speed-hint--gone' : '')}>
          {low ? 'Speed bonus window closed' : '⚡ Answer within 20s for a +5 bonus'}
        </div>
      )}

      <div className="q-prompt">{question.text}</div>
      {question.multi && (
        <div className="q-multi-note">Select all that apply · {correctCount} correct</div>
      )}

      <div className="q-options">
        {choices.map((c, i) => {
          const isSel = selected.includes(c.id);
          const color = BADGE_COLORS[i % BADGE_COLORS.length];
          return (
            <button
              key={c.id}
              className={'opt' + (isSel ? ' opt--sel' : '')}
              onClick={() => toggle(c.id)}
              aria-pressed={isSel}
            >
              {question.multi ? (
                <span className={'opt__check' + (isSel ? ' is-on' : '')} aria-hidden>
                  {isSel && '✓'}
                </span>
              ) : (
                <span className="opt__badge" style={{ background: color }} aria-hidden>
                  {String.fromCharCode(65 + i)}
                </span>
              )}
              <span className="opt__text">{c.label}</span>
            </button>
          );
        })}
      </div>

      {question.multi && (
        <button
          className="q-submit"
          onClick={() => submit(selected)}
          disabled={selected.length === 0}
        >
          Submit answer
        </button>
      )}

      <div className="q-dots" aria-hidden>
        {Array.from({ length: total }).map((_, i) => (
          <span key={i} className={'q-dot' + (i === index ? ' is-on' : '')} />
        ))}
      </div>
    </div>
  );
}
