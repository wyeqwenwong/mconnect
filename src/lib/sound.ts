// ============================================================
// Synthesized SFX via Web Audio — GDD §8. No audio assets required.
// tap / correct / wrong / tick / timeup / fanfare. Muted via settings.
// ============================================================

let ctx: AudioContext | null = null;
let enabled = true;

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  // Kiosks may start suspended until first user gesture.
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

/** Call once from a user gesture (e.g. Start button) to unlock audio on kiosk. */
export function unlockAudio() {
  ac();
}

function tone(
  freq: number,
  startOffset: number,
  duration: number,
  type: OscillatorType = 'sine',
  gain = 0.18,
) {
  const context = ac();
  if (!context) return;
  const t0 = context.currentTime + startOffset;
  const osc = context.createOscillator();
  const g = context.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g).connect(context.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export const sfx = {
  tap() {
    if (!enabled) return;
    tone(420, 0, 0.09, 'triangle', 0.12);
  },
  correct() {
    if (!enabled) return;
    // upward musical arpeggio
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.08, 0.16, 'sine', 0.16));
  },
  wrong() {
    if (!enabled) return;
    tone(311.13, 0, 0.18, 'sawtooth', 0.14);
    tone(233.08, 0.14, 0.28, 'sawtooth', 0.14);
  },
  tick() {
    if (!enabled) return;
    tone(880, 0, 0.05, 'square', 0.06);
  },
  timeup() {
    if (!enabled) return;
    [440, 587.33, 880].forEach((f, i) => tone(f, i * 0.1, 0.16, 'square', 0.12));
  },
  fanfare() {
    if (!enabled) return;
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
      tone(f, i * 0.11, 0.3, 'triangle', 0.16),
    );
  },
};
