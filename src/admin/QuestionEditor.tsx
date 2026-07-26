import { useState } from 'react';
import { STRATEGY_ICONS, STRATEGY_ICON_KEYS, iconFile } from '../lib/assets';
import type { Choice, MatchAnswer, MatchType, Question } from '../lib/types';

let uid = 0;
const nid = (p: string) => `${p}${Date.now()}${uid++}`;

const MAX_CHOICES = 8;
const MIN_CHOICES = 2;
const MAX_TYPES = 6;
const MIN_TYPES = 2;

export function QuestionEditor({
  question,
  onCancel,
  onSave,
}: {
  question: Question;
  onCancel: () => void;
  onSave: (q: Question) => void;
}) {
  const [q, setQ] = useState<Question>(structuredClone(question));
  const [error, setError] = useState('');
  const set = (patch: Partial<Question>) => setQ((prev) => ({ ...prev, ...patch }));

  const isMatch = q.kind === 'match';

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <h2>
            {question.text || question.prompt ? 'Edit' : 'New'} {isMatch ? 'match' : 'quiz'} question
          </h2>
          <button className="modal__close" onClick={onCancel} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modal__body">
          <div className="field-row">
            <label className="field field--sm">
              <span className="field__label">Points</span>
              <input
                className="field__input"
                type="number"
                min={0}
                step={10}
                value={q.points}
                onChange={(e) => set({ points: Number(e.target.value) })}
              />
            </label>
            <label className="field field--sm toggle-field">
              <span className="field__label">Active in pool</span>
              <button
                type="button"
                className={'toggle' + (q.active ? ' is-on' : '')}
                onClick={() => set({ active: !q.active })}
                role="switch"
                aria-checked={q.active}
              >
                <span className="toggle__knob" />
              </button>
            </label>
          </div>

          {isMatch ? (
            <MatchEditor q={q} setQ={setQ} />
          ) : (
            <QuizEditor q={q} setQ={setQ} />
          )}

          {error && <div className="modal__error">{error}</div>}
        </div>

        <div className="modal__foot">
          <button className="btn btn--ghost modal__btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn btn--primary modal__btn"
            onClick={() => {
              const err = isMatch ? validateMatch(q) : validateQuiz(q);
              if (err) setError(err);
              else onSave(q);
            }}
          >
            Save question
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
//  Quiz editor
// ============================================================
function QuizEditor({ q, setQ }: { q: Question; setQ: React.Dispatch<React.SetStateAction<Question>> }) {
  const choices = q.choices ?? [];
  const setChoice = (id: string, patch: Partial<Choice>) =>
    setQ((prev) => ({ ...prev, choices: (prev.choices ?? []).map((c) => (c.id === id ? { ...c, ...patch } : c)) }));

  const toggleCorrect = (id: string) =>
    setQ((prev) => {
      const cs = prev.choices ?? [];
      if (prev.multi) return { ...prev, choices: cs.map((c) => (c.id === id ? { ...c, correct: !c.correct } : c)) };
      return { ...prev, choices: cs.map((c) => ({ ...c, correct: c.id === id })) };
    });

  const setMulti = (multi: boolean) =>
    setQ((prev) => {
      let cs = prev.choices ?? [];
      if (!multi) {
        const first = cs.find((c) => c.correct)?.id;
        cs = cs.map((c) => ({ ...c, correct: c.id === first }));
      }
      return { ...prev, multi, choices: cs };
    });

  return (
    <>
      <label className="field">
        <span className="field__label">Question text</span>
        <textarea
          className="field__input"
          rows={2}
          value={q.text ?? ''}
          placeholder="e.g. My CPM is too high…"
          onChange={(e) => setQ((p) => ({ ...p, text: e.target.value }))}
        />
      </label>
      <label className="field">
        <span className="field__label">Explanation (shown on feedback)</span>
        <textarea
          className="field__input"
          rows={2}
          value={q.explanation ?? ''}
          onChange={(e) => setQ((p) => ({ ...p, explanation: e.target.value }))}
        />
      </label>

      <div className="field field--sm">
        <span className="field__label">Answer mode</span>
        <div className="seg">
          <button className={'seg__btn' + (!q.multi ? ' is-active' : '')} onClick={() => setMulti(false)} type="button">
            Single
          </button>
          <button className={'seg__btn' + (q.multi ? ' is-active' : '')} onClick={() => setMulti(true)} type="button">
            Multi
          </button>
        </div>
      </div>

      <div className="field__label choices-label">
        Answer choices ({choices.length}/{MAX_CHOICES}) — {q.multi ? 'check all correct' : 'select the one correct'}
      </div>
      <div className="choices-edit">
        {choices.map((c) => (
          <div className="choice-edit" key={c.id}>
            <button
              type="button"
              className={'choice-edit__mark' + (c.correct ? ' is-correct' : '')}
              onClick={() => toggleCorrect(c.id)}
              aria-pressed={c.correct}
            >
              {c.correct ? '✓' : ''}
            </button>
            <input
              className="choice-edit__label"
              value={c.label}
              placeholder="Answer label"
              onChange={(e) => setChoice(c.id, { label: e.target.value })}
            />
            <button
              type="button"
              className="choice-edit__remove"
              onClick={() => setQ((p) => ({ ...p, choices: (p.choices ?? []).filter((x) => x.id !== c.id) }))}
              disabled={choices.length <= MIN_CHOICES}
              aria-label="Remove"
            >
              ✕
            </button>
          </div>
        ))}
        {choices.length < MAX_CHOICES && (
          <button
            type="button"
            className="choice-add"
            onClick={() =>
              setQ((p) => ({ ...p, choices: [...(p.choices ?? []), { id: nid('c'), label: '', emoji: '', correct: false }] }))
            }
          >
            + Add choice
          </button>
        )}
      </div>
    </>
  );
}

// ============================================================
//  Match editor — types (icons) + answers, plus irrelevant decoys
// ============================================================
function MatchEditor({ q, setQ }: { q: Question; setQ: React.Dispatch<React.SetStateAction<Question>> }) {
  const types = q.types ?? [];
  const answers = q.answers ?? [];
  const relevant = answers.filter((a) => a.typeId !== null);
  const irrelevant = answers.filter((a) => a.typeId === null);
  const [includeIrrelevant, setIncludeIrrelevant] = useState(irrelevant.length > 0);

  const setTypes = (next: MatchType[]) => setQ((p) => ({ ...p, types: next }));
  const setAnswers = (next: MatchAnswer[]) => setQ((p) => ({ ...p, answers: next }));

  const updateType = (id: string, patch: Partial<MatchType>) =>
    setTypes(types.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const removeType = (id: string) => {
    setTypes(types.filter((t) => t.id !== id));
    // any answer pointing at the removed type becomes irrelevant
    setAnswers(answers.map((a) => (a.typeId === id ? { ...a, typeId: null } : a)));
  };
  const addType = () => {
    if (types.length >= MAX_TYPES) return;
    const used = new Set(types.map((t) => t.icon));
    const nextIcon = STRATEGY_ICON_KEYS.find((k) => !used.has(k)) ?? STRATEGY_ICON_KEYS[0];
    setTypes([...types, { id: nid('t'), icon: nextIcon, label: STRATEGY_ICONS[nextIcon].label }]);
  };

  const updateAnswer = (id: string, patch: Partial<MatchAnswer>) =>
    setAnswers(answers.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const removeAnswer = (id: string) => setAnswers(answers.filter((a) => a.id !== id));

  return (
    <>
      <label className="field">
        <span className="field__label">Prompt</span>
        <input
          className="field__input"
          value={q.prompt ?? ''}
          placeholder="Match each problem to the strategy it solves"
          onChange={(e) => setQ((p) => ({ ...p, prompt: e.target.value }))}
        />
      </label>

      {/* Types / icons */}
      <div className="field__label choices-label">
        Icons / types ({types.length}/{MAX_TYPES}) — pick an A+ icon and label
      </div>
      <div className="choices-edit">
        {types.map((t) => (
          <div className="type-edit" key={t.id}>
            <div className="type-edit__icons">
              {STRATEGY_ICON_KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  className={'type-edit__icon' + (t.icon === k ? ' is-active' : '')}
                  onClick={() => updateType(t.id, { icon: k })}
                  title={STRATEGY_ICONS[k].label}
                >
                  <img src={iconFile(k)} alt={STRATEGY_ICONS[k].label} />
                </button>
              ))}
            </div>
            <input
              className="choice-edit__label"
              value={t.label}
              placeholder="Type label"
              onChange={(e) => updateType(t.id, { label: e.target.value })}
            />
            <button
              type="button"
              className="choice-edit__remove"
              onClick={() => removeType(t.id)}
              disabled={types.length <= MIN_TYPES}
              aria-label="Remove type"
            >
              ✕
            </button>
          </div>
        ))}
        {types.length < MAX_TYPES && (
          <button type="button" className="choice-add" onClick={addType}>
            + Add icon / type
          </button>
        )}
      </div>

      {/* Answers → type (multiple answers may share a type) */}
      <div className="field__label choices-label">Answers — each maps to the type it matches</div>
      <div className="choices-edit">
        {relevant.map((a) => (
          <div className="choice-edit" key={a.id}>
            <input
              className="choice-edit__label"
              value={a.text}
              placeholder="Answer / problem text"
              onChange={(e) => updateAnswer(a.id, { text: e.target.value })}
            />
            <select
              className="answer-type-select"
              value={a.typeId ?? ''}
              onChange={(e) => updateAnswer(a.id, { typeId: e.target.value })}
            >
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <button type="button" className="choice-edit__remove" onClick={() => removeAnswer(a.id)} aria-label="Remove">
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          className="choice-add"
          onClick={() => setAnswers([...answers, { id: nid('a'), text: '', typeId: types[0]?.id ?? null }])}
        >
          + Add answer
        </button>
      </div>

      {/* Irrelevant decoys */}
      <label className="irr-check">
        <input
          type="checkbox"
          checked={includeIrrelevant}
          onChange={(e) => {
            setIncludeIrrelevant(e.target.checked);
            if (!e.target.checked) setAnswers(answers.filter((a) => a.typeId !== null)); // drop decoys
          }}
        />
        <span>Include irrelevant answers (match nowhere)</span>
      </label>
      {includeIrrelevant && (
        <div className="choices-edit">
          {irrelevant.map((a) => (
            <div className="choice-edit" key={a.id}>
              <span className="irr-tag">decoy</span>
              <input
                className="choice-edit__label"
                value={a.text}
                placeholder="Irrelevant answer text"
                onChange={(e) => updateAnswer(a.id, { text: e.target.value })}
              />
              <button type="button" className="choice-edit__remove" onClick={() => removeAnswer(a.id)} aria-label="Remove">
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            className="choice-add"
            onClick={() => setAnswers([...answers, { id: nid('a'), text: '', typeId: null }])}
          >
            + Add irrelevant answer
          </button>
        </div>
      )}
    </>
  );
}

// ---- validation ----
function validateQuiz(q: Question): string {
  const choices = q.choices ?? [];
  if (!q.text?.trim()) return 'Question text is required.';
  if (choices.length < MIN_CHOICES) return 'At least 2 choices are required.';
  if (choices.some((c) => !c.label.trim())) return 'Every choice needs a label.';
  const correct = choices.filter((c) => c.correct).length;
  if (correct < 1) return 'Mark at least one correct answer.';
  if (!q.multi && correct !== 1) return 'Single-select needs exactly one correct answer.';
  if (q.points < 0) return 'Points cannot be negative.';
  return '';
}

function validateMatch(q: Question): string {
  const types = q.types ?? [];
  const answers = q.answers ?? [];
  if (!q.prompt?.trim()) return 'Prompt is required.';
  if (types.length < MIN_TYPES) return 'Add at least 2 icons / types.';
  if (types.some((t) => !t.label.trim())) return 'Every type needs a label.';
  const relevant = answers.filter((a) => a.typeId !== null);
  if (relevant.length < 1) return 'Add at least one answer that maps to a type.';
  if (answers.some((a) => !a.text.trim())) return 'Every answer needs text.';
  if (relevant.some((a) => !types.find((t) => t.id === a.typeId))) return 'An answer maps to a missing type.';
  if (q.points < 0) return 'Points cannot be negative.';
  return '';
}
