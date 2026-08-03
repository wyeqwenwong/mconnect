import { useEffect, useRef, useState } from 'react';
import { asset } from '../../lib/assets';
import { scoreQuiz } from '../../lib/scoring';
import { sfx } from '../../lib/sound';
import { TIME_PER_QUESTION_MS, type GameSettings, type Question, type QuestionResult } from '../../lib/types';

const TICK_MS = 100;

// Quiz question (Confetti Pop). Choices render as tappable speech bubbles
// (handoff §6.2). Single-select locks on tap; multi-select toggles + submit.
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
        if (sec === 10) sfx.warn(); // "final 10 seconds" cue
        lastSec = sec;
        sfx.countdown(sec); // accelerating/rising beep as time runs out
      }
      if (rem <= 0) {
        clearInterval(iv);
        if (!doneRef.current) {
          sfx.timeup();
          submit(question.multi ? selectedRef.current : []);
        }
      }
    }, TICK_MS);
    return () => clearInterval(iv);
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
      setTimeout(() => submit([choiceId]), 240);
    }
  }

  const secLeft = Math.ceil(remaining / 1000);

  return (
    <div className="screen quiz">
      <img src={asset('bg3.png')} className="bg" alt="" aria-hidden />

      <header className="c-head">
        <img src={asset('logo.png')} className="c-logo" alt="Meta" />
        <div className="c-chip">👤 {playerName}</div>
      </header>

      <div className="quiz__prompt">
        {question.text}
        <span className="match__timer"> · ⏱ {secLeft}s</span>
      </div>
      <div className="quiz__sub">
        Question {index + 1} of {total} · {question.points} pts
        {question.multi && <span className="quiz__badge">Select all that apply — {correctCount} correct</span>}
      </div>

      <div className="quiz__options">
        {choices.map((c) => {
          const isSel = selected.includes(c.id);
          return (
            <button
              key={c.id}
              className={'bubble bubble--tap' + (isSel ? ' bubble--sel' : '')}
              onClick={() => toggle(c.id)}
              aria-pressed={isSel}
            >
              {question.multi && <span className="bubble__box">{isSel && '✓'}</span>}
              <span className="bubble__text">{c.label}</span>
            </button>
          );
        })}
      </div>

      {question.multi ? (
        <div className="quiz__foot">
          <span className="match__hint">{selected.length} selected</span>
          <button
            className="match__submit"
            onClick={() => submit(selected)}
            disabled={selected.length === 0}
          >
            <img src={asset('next.png')} alt="Submit" />
          </button>
        </div>
      ) : settings.speedBonus ? (
        <div className="quiz__hint">Answer within 20s for full points</div>
      ) : (
        <div className="quiz__hint" />
      )}
    </div>
  );
}
