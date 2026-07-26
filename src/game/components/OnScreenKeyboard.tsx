import type { Dispatch, SetStateAction } from 'react';
import { sfx } from '../../lib/sound';

const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
const MAX = 30;

/** Touch keyboard for kiosk name/company entry (README §5.1, max ~30 chars).
 *  Uses functional state updates so fast successive taps never drop a key. */
export function OnScreenKeyboard({ onChange }: { onChange: Dispatch<SetStateAction<string>> }) {
  const press = (ch: string) => {
    sfx.tap();
    onChange((v) => (v.length < MAX ? v + ch : v));
  };
  const backspace = () => {
    sfx.tap();
    onChange((v) => v.slice(0, -1));
  };
  const space = () => {
    sfx.tap();
    onChange((v) => (v.length < MAX && v.length > 0 ? v + ' ' : v));
  };

  return (
    <div className="kbd">
      {ROWS.map((row, i) => (
        <div className="kbd__row" key={i}>
          {i === 2 && (
            <button className="kbd__key kbd__key--wide" onClick={backspace} aria-label="Backspace">
              ⌫
            </button>
          )}
          {row.split('').map((ch) => (
            <button className="kbd__key" key={ch} onClick={() => press(ch)}>
              {ch}
            </button>
          ))}
          {/* keep the bottom letters aligned now the enter key is gone */}
          {i === 2 && <span className="kbd__key kbd__key--wide kbd__key--spacer" aria-hidden />}
        </div>
      ))}
      <div className="kbd__row">
        <button className="kbd__key kbd__key--space" onClick={space}>
          space
        </button>
      </div>
    </div>
  );
}
