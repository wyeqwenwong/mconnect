import { useState } from 'react';
import { asset } from '../../lib/assets';
import { Blob, Dot, Pacman } from '../components/Decor';
import { OnScreenKeyboard } from '../components/OnScreenKeyboard';
import { unlockAudio, sfx } from '../../lib/sound';

// Screen 1 — Entry (ref 3a Entry). bg1 full-bleed; logo + wordmark; name box
// with overlaid input + on-screen keyboard; START button asset.
export function EntryScreen({ onStart }: { onStart: (name: string) => void }) {
  const [name, setName] = useState('');

  const start = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    unlockAudio();
    sfx.tap();
    onStart(trimmed);
  };

  return (
    <div className="screen entry">
      <img src={asset('bg1.png')} className="bg" alt="" aria-hidden />
      {/* Decor lives only above the input (y<720) or below the start button
          (y>1580) so it never overlaps the input / keyboard / button. */}
      <Dot style={{ top: 250, right: 40, width: 170 }} />
      <Dot style={{ bottom: 90, left: 60, width: 170 }} />
      <Pacman style={{ bottom: 110, right: 300, width: 92 }} />
      <Blob color="var(--magenta)" face="•—•" rotate={-24} style={{ top: 150, right: 130, width: 110, height: 64 }} />
      <Blob color="var(--teal)" face="• ᴗ •" rotate={-12} style={{ bottom: 230, right: 70, width: 90, height: 66, borderRadius: '55% 45% 50% 50%' }} />

      <img src={asset('logo.png')} className="entry__logo" alt="Meta" />
      <img src={asset('wordmark.png')} className="entry__wordmark" alt="Meta Connect & Convert" />
      <div className="entry__subtitle">
        Test your marketing expertise
        <br />
        and compete for the top score
      </div>

      <div className="entry__namebox">
        <img src={asset('name-box.png')} alt="" aria-hidden />
        <div className={'entry__input' + (name ? ' has-value' : '')}>
          {name || 'Your Name here..'}
          <span className="entry__caret" />
        </div>
      </div>

      <OnScreenKeyboard onChange={setName} />

      <button className="entry__start" onClick={start} disabled={!name.trim()} aria-label="Start">
        <img src={asset('start.png')} alt="Start" />
      </button>
    </div>
  );
}
