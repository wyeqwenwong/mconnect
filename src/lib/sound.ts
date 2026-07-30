// ============================================================
// Synthesized audio via Web Audio — no audio files (nothing to download or
// bundle beyond the code). SFX: tap / select / correct / wrong / tick / timeup
// / start / fanfare. Plus a gentle looping background-music bed. All muted
// together via the admin "sound" setting.
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
  if (!on) stopMusic();
}

/** Call once from a user gesture (e.g. Start button) to unlock audio on kiosk. */
export function unlockAudio() {
  ac();
}

// ---- one-shot SFX -------------------------------------------------------
function tone(freq: number, startOffset: number, duration: number, type: OscillatorType = 'sine', gain = 0.18) {
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
  select() {
    if (!enabled) return;
    tone(587.33, 0, 0.08, 'sine', 0.12);
    tone(880, 0.05, 0.12, 'sine', 0.1);
  },
  correct() {
    if (!enabled) return;
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
  start() {
    if (!enabled) return;
    [392, 523.25, 659.25, 783.99].forEach((f, i) => tone(f, i * 0.07, 0.18, 'triangle', 0.14));
  },
  fanfare() {
    if (!enabled) return;
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, i * 0.11, 0.3, 'triangle', 0.16));
  },
};

// ---- looping background music ------------------------------------------
// A soft I–V–vi–IV pad + bass + light arpeggio, scheduled a couple of bars
// ahead so it loops seamlessly. Kept low in the mix so SFX sit on top.
const MUSIC_MASTER = 0.6;
const BAR = 1.9; // seconds per chord

// [pad triad..., bass root]
const PROG: { pad: number[]; bass: number }[] = [
  { pad: [261.63, 329.63, 392.0], bass: 130.81 }, // C
  { pad: [196.0, 246.94, 293.66], bass: 98.0 }, //   G
  { pad: [220.0, 261.63, 329.63], bass: 110.0 }, //  Am
  { pad: [174.61, 220.0, 261.63], bass: 87.31 }, //  F
];

let musicGain: GainNode | null = null;
let musicPlaying = false;
let musicTimer: number | undefined;
let nextBarTime = 0;
let barIndex = 0;

function ensureMusicGain(c: AudioContext): GainNode {
  if (!musicGain) {
    musicGain = c.createGain();
    musicGain.gain.value = 0.0001;
    musicGain.connect(c.destination);
  }
  return musicGain;
}

function musicNote(c: AudioContext, freq: number, start: number, dur: number, type: OscillatorType, peak: number) {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + Math.min(0.08, dur * 0.3));
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g).connect(musicGain!);
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

function scheduleBar(c: AudioContext, t: number, chord: { pad: number[]; bass: number }) {
  musicNote(c, chord.bass, t, BAR * 0.98, 'sine', 0.06); // bass
  chord.pad.forEach((f) => musicNote(c, f, t, BAR * 0.98, 'triangle', 0.03)); // pad
  const eighth = BAR / 8; // light arpeggio, one octave up
  for (let i = 0; i < 8; i++) {
    const f = chord.pad[[0, 1, 2, 1, 0, 2, 1, 2][i] % chord.pad.length] * 2;
    musicNote(c, f, t + i * eighth, eighth * 0.9, 'sine', 0.035);
  }
}

function pump() {
  if (!musicPlaying) return;
  const c = ac();
  if (!c) return;
  while (nextBarTime < c.currentTime + 2 * BAR) {
    scheduleBar(c, nextBarTime, PROG[barIndex % PROG.length]);
    nextBarTime += BAR;
    barIndex++;
  }
  musicTimer = window.setTimeout(pump, BAR * 500);
}

export function startMusic() {
  const c = ac();
  if (!c || !enabled || musicPlaying) return;
  const g = ensureMusicGain(c);
  musicPlaying = true;
  barIndex = 0;
  nextBarTime = c.currentTime + 0.15;
  g.gain.cancelScheduledValues(c.currentTime);
  g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), c.currentTime);
  g.gain.exponentialRampToValueAtTime(MUSIC_MASTER, c.currentTime + 1.2);
  pump();
}

export function stopMusic() {
  musicPlaying = false;
  if (musicTimer) window.clearTimeout(musicTimer);
  if (musicGain && ctx) {
    musicGain.gain.cancelScheduledValues(ctx.currentTime);
    musicGain.gain.setValueAtTime(Math.max(musicGain.gain.value, 0.0001), ctx.currentTime);
    musicGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
  }
}
