import { useEffect, useState } from 'react';
import { store, subscribe } from '../lib/store';
import { STRATEGY_ICONS, STRATEGY_ICON_KEYS } from '../lib/assets';
import type { GameSettings, Question, QuestionKind } from '../lib/types';
import { QuestionEditor } from './QuestionEditor';

let uid = 0;
const nid = (p: string) => `${p}${Date.now()}${uid++}`;

export function QuestionPool() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [settings, setSettings] = useState<GameSettings | null>(null);
  const [editing, setEditing] = useState<Question | null>(null);

  const load = () => {
    store.getAllQuestions().then(setQuestions);
    store.getSettings().then(setSettings);
  };
  useEffect(() => {
    load();
    return subscribe('questions', load);
  }, []);

  const mode = settings?.mode ?? 'quiz';
  const perGame = settings?.questionsPerGame ?? 5;
  const activeOfMode = questions.filter((q) => q.active && q.kind === mode).length;
  // Match mode always plays exactly one active question; quiz needs ≥ perGame.
  const poolOk = mode === 'match' ? activeOfMode === 1 : activeOfMode >= perGame;
  const poolNote =
    mode === 'match'
      ? activeOfMode === 1
        ? 'played each game ✓'
        : activeOfMode === 0
          ? '⚠ no active match question'
          : '⚠ only one match question may be active'
      : `${perGame} used per game ${poolOk ? '✓' : '⚠ fewer than questions-per-game'}`;

  function blank(kind: QuestionKind): Question {
    if (kind === 'quiz') {
      return {
        id: nid('q'),
        kind: 'quiz',
        text: '',
        explanation: '',
        points: 100,
        multi: false,
        active: true,
        choices: STRATEGY_ICON_KEYS.map((k, i) => ({
          id: nid('c'),
          label: STRATEGY_ICONS[k].label,
          emoji: '',
          correct: i === 0,
        })),
      };
    }
    const t1 = nid('t');
    const t2 = nid('t');
    return {
      id: nid('m'),
      kind: 'match',
      prompt: 'Match each problem to the A+ Strategy that solves it',
      points: 100,
      active: true,
      types: [
        { id: t1, icon: 'audience', label: STRATEGY_ICONS.audience.label },
        { id: t2, icon: 'creative', label: STRATEGY_ICONS.creative.label },
      ],
      answers: [
        { id: nid('a'), text: '', typeId: t1 },
        { id: nid('a'), text: '', typeId: t2 },
      ],
    };
  }

  async function save(q: Question) {
    await store.saveQuestion(q);
    setEditing(null);
    load();
  }
  async function remove(id: string) {
    if (!window.confirm('Delete this question?')) return;
    await store.deleteQuestion(id);
    load();
  }

  function summary(q: Question): string {
    if (q.kind === 'match') {
      const rel = (q.answers ?? []).filter((a) => a.typeId !== null).length;
      const dec = (q.answers ?? []).filter((a) => a.typeId === null).length;
      return `${q.types?.length ?? 0} icons · ${rel} answers${dec ? ` · ${dec} decoy` : ''}`;
    }
    return (q.choices ?? [])
      .filter((c) => c.correct)
      .map((c) => c.label.replace('A+ ', ''))
      .join(', ');
  }

  return (
    <div className="pool">
      <div className="section-head">
        <h1 className="section-title">
          Question pool{' '}
          <span className={'section-sub' + (poolOk ? '' : ' section-sub--warn')}>
            {activeOfMode} active {mode} · {poolNote}
          </span>
        </h1>
        <div className="pool-add">
          <button className="pill-btn pill-btn--ghost" onClick={() => setEditing(blank('quiz'))}>
            + Quiz question
          </button>
          <button className="pill-btn" onClick={() => setEditing(blank('match'))}>
            + Match question
          </button>
        </div>
      </div>

      <div className="table">
        <div className="table__head table__row">
          <span>QUESTION</span>
          <span>KIND</span>
          <span>DETAIL</span>
          <span>POINTS</span>
          <span />
        </div>
        {questions.map((q) => (
          <div className="table__row" key={q.id}>
            <span className="table__q">
              {!q.active && <span className="tag tag--off">off</span>}
              {q.kind === 'match' ? q.prompt : q.text || <em className="muted">Untitled</em>}
            </span>
            <span>
              <span className={'tag ' + (q.kind === 'match' ? 'tag--multi' : 'tag--single')}>{q.kind}</span>
            </span>
            <span className="table__correct">{summary(q)}</span>
            <span>{q.points}</span>
            <span className="table__actions">
              <button className="link-btn" onClick={() => setEditing(q)}>
                Edit ✎
              </button>
              <button className="link-btn link-btn--danger" onClick={() => remove(q.id)}>
                Delete
              </button>
            </span>
          </div>
        ))}
        {questions.length === 0 && <div className="table__empty">No questions yet. Add one to begin.</div>}
      </div>

      {editing && <QuestionEditor question={editing} onCancel={() => setEditing(null)} onSave={save} />}
    </div>
  );
}
