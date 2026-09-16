import { useState } from 'react';
import { asset } from '../../lib/assets';
import { Leaves } from '../components/Leaves';
import { OnScreenKeyboard } from '../components/OnScreenKeyboard';
import { unlockAudio, sfx } from '../../lib/sound';

// Screen 1 — Entry (assetv2 Kiosk_v1_2). Pastel gradient + green leaves; Meta
// logo; "Build for Agentic AI 2026" heading; white card with name input + START;
// on-screen keyboard below.
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
    <div className="screen v2 entry-v2">
      <img src={asset('bg-v2.png')} className="bg" alt="" aria-hidden />
      <Leaves />

      <img src={asset('meta-logo.png')} className="entry-v2__logo" alt="Meta" />
      <img src={asset('subhead.png')} className="entry-v2__subhead" alt="Meta Business Messaging Sessions" />
      <img src={asset('heading.png')} className="entry-v2__heading" alt="Build for Agentic AI 2026" />

      <div className="entry-v2__card">
        <div className="entry-v2__label">Who’s playing?</div>
        <div className={'entry-v2__input' + (name ? ' has-value' : '')}>
          {name || 'Name or company…'}
          <span className="entry-v2__caret" />
        </div>
        <button className="entry-v2__start" onClick={start} disabled={!name.trim()} aria-label="Start">
          <img src={asset('start-v2.png')} alt="Start" />
        </button>
      </div>

      <OnScreenKeyboard onChange={setName} />

      <div className="entry-v2__foot">5 questions · 30 seconds each · live leaderboard</div>
    </div>
  );
}
