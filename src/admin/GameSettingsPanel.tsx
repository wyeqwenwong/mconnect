import { useEffect, useState } from 'react';
import { store } from '../lib/store';
import { DEFAULT_SETTINGS } from '../lib/seed';
import type { GameSettings } from '../lib/types';

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      className={'toggle' + (on ? ' is-on' : '')}
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
    >
      <span className="toggle__knob" />
    </button>
  );
}

export function GameSettingsPanel() {
  const [s, setS] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    store.getSettings().then(setS);
  }, []);

  const set = (patch: Partial<GameSettings>) => {
    setS((prev) => ({ ...prev, ...patch }));
    setSaved(false);
  };

  async function save() {
    await store.saveSettings(s);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="settings">
      <h1 className="section-title">Game settings</h1>

      <div className="card settings-card">
        <div className="set-row">
          <div className="set-label">
            Game mode
            <span className="set-hint">Which question type this event plays</span>
          </div>
          <div className="seg">
            <button
              type="button"
              className={'seg__btn' + (s.mode === 'quiz' ? ' is-active' : '')}
              onClick={() => set({ mode: 'quiz' })}
            >
              Quiz
            </button>
            <button
              type="button"
              className={'seg__btn' + (s.mode === 'match' ? ' is-active' : '')}
              onClick={() => set({ mode: 'match' })}
            >
              Mix &amp; Match
            </button>
          </div>
        </div>

        {s.mode === 'match' ? (
          <div className="set-row">
            <div className="set-label">
              Questions per game
              <span className="set-hint">Mix &amp; Match always plays the one active match question</span>
            </div>
            <div className="set-number set-number--static">1</div>
          </div>
        ) : (
          <div className="set-row">
            <div className="set-label">Questions per game</div>
            <input
              className="set-number"
              type="number"
              min={1}
              max={50}
              value={s.questionsPerGame}
              onChange={(e) => set({ questionsPerGame: Math.max(1, Number(e.target.value)) })}
            />
          </div>
        )}

        <div className="set-row">
          <div className="set-label">
            Speed bonus
            <span className="set-hint">Match: 20 pts/correct · +5 per 5s left · Quiz: full &lt;20s, 75% &lt;30s</span>
          </div>
          <Toggle on={s.speedBonus} onChange={(v) => set({ speedBonus: v })} />
        </div>

        {s.speedBonus && (
          <div className="set-row set-row--indent">
            <div className="set-label">Perfect speedrun bonus</div>
            <input
              className="set-number"
              type="number"
              min={0}
              step={10}
              value={s.speedrunBonus}
              onChange={(e) => set({ speedrunBonus: Math.max(0, Number(e.target.value)) })}
            />
          </div>
        )}

        <div className="set-row">
          <div className="set-label">Per-question score display</div>
          <Toggle on={s.perQuestionScoreDisplay} onChange={(v) => set({ perQuestionScoreDisplay: v })} />
        </div>

        <div className="set-row">
          <div className="set-label">Randomize questions &amp; answers</div>
          <Toggle on={s.randomize} onChange={(v) => set({ randomize: v })} />
        </div>

        <div className="set-row">
          <div className="set-label">
            Sound effects
            <span className="set-hint">Tick, correct, wrong, finish fanfare on kiosks</span>
          </div>
          <Toggle on={s.sound} onChange={(v) => set({ sound: v })} />
        </div>

        <div className="set-note">ℹ️ Changes propagate to all panels at the start of the next game.</div>

        <button className="btn btn--primary set-save" onClick={save}>
          {saved ? 'Saved ✓' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}
