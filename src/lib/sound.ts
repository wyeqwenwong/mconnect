// ============================================================
// Synthesized audio via Web Audio — no audio files (nothing to download; stays
// self-contained in the .exe). One-shot SFX + a looping music engine with three
// themes (home / game / result). All muted together via the admin "sound"
// setting.
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
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function setSoundEnabled(on: boolean) {
  enabled = on;
  if (!on) stopMusic();
}

/** Call from a user gesture to unlock audio on kiosk. */
export function unlockAudio() {
  ac();
}

// ---- one-shot SFX -------------------------------------------------------
function tone(freq: number, startOffset: number, duration: number, type: OscillatorType = 'sine', gain = 0.18) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + startOffset;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g).connect(c.destination);
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
    tone(587.33, 0, 0.08, 'sine', 0.13);
    tone(880, 0.05, 0.12, 'sine', 0.11);
  },
  correct() {
    if (!enabled) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.08, 0.16, 'sine', 0.18));
  },
  wrong() {
    if (!enabled) return;
    tone(311.13, 0, 0.18, 'sawtooth', 0.15);
    tone(233.08, 0.14, 0.28, 'sawtooth', 0.15);
  },
  start() {
    if (!enabled) return;
    [392, 523.25, 659.25, 783.99].forEach((f, i) => tone(f, i * 0.07, 0.18, 'triangle', 0.16));
  },
  timeup() {
    if (!enabled) return;
    [440, 587.33, 880].forEach((f, i) => tone(f, i * 0.1, 0.16, 'square', 0.14));
  },
  fanfare() {
    if (!enabled) return;
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, i * 0.11, 0.32, 'triangle', 0.18));
  },
  /** One-off cue the moment the final 10 seconds begin. */
  warn() {
    if (!enabled) return;
    [660, 880].forEach((f, i) => tone(f, i * 0.1, 0.15, 'sawtooth', 0.17));
  },
  /** Per-second countdown beep for the last 10s — rises in pitch + volume as
   *  the clock runs down; doubles up under 3s for extra tension. */
  countdown(sec: number) {
    if (!enabled) return;
    const step = 10 - Math.max(0, Math.min(10, sec));
    const f = 600 + step * 55;
    const g = Math.min(0.22, 0.09 + step * 0.013);
    tone(f, 0, 0.06, 'square', g);
    if (sec <= 3) tone(f * 1.5, 0.09, 0.05, 'square', 0.13);
  },
};

// ============================================================
//  Looping music engine (themes)
// ============================================================
type Chord = { pad: number[]; bass: number };
const C: Chord = { pad: [261.63, 329.63, 392.0], bass: 130.81 };
const G: Chord = { pad: [196.0, 246.94, 293.66], bass: 98.0 };
const Am: Chord = { pad: [220.0, 261.63, 329.63], bass: 110.0 };
const F: Chord = { pad: [174.61, 220.0, 261.63], bass: 87.31 };
const Dm: Chord = { pad: [293.66, 349.23, 440.0], bass: 146.83 };

type Theme = {
  barSec: number;
  prog: Chord[];
  padType: OscillatorType;
  arpType: OscillatorType;
  padGain: number;
  bassGain: number;
  arpGain: number;
  arpDiv: number; // arpeggio notes per bar
  kickBeats: number[]; // beat indices (of 4) with a kick
  drumGain: number;
};

const THEMES: Record<string, Theme> = {
  // welcoming, mid-tempo
  home: { barSec: 1.5, prog: [C, G, Am, F], padType: 'triangle', arpType: 'triangle', padGain: 0.06, bassGain: 0.11, arpGain: 0.06, arpDiv: 8, kickBeats: [0, 2], drumGain: 0.2 },
  // driving, fast, energetic (during play)
  game: { barSec: 1.0, prog: [Am, F, C, G], padType: 'sawtooth', arpType: 'square', padGain: 0.05, bassGain: 0.13, arpGain: 0.07, arpDiv: 16, kickBeats: [0, 1, 2, 3], drumGain: 0.26 },
  // triumphant, celebratory (results)
  result: { barSec: 1.35, prog: [C, G, Am, F, Dm, F, G, G], padType: 'sawtooth', arpType: 'sawtooth', padGain: 0.07, bassGain: 0.11, arpGain: 0.07, arpDiv: 8, kickBeats: [0, 2], drumGain: 0.22 },
};

const MUSIC_MASTER = 1.0;
let musicGain: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let musicPlaying = false;
let currentTheme = '';
let theme: Theme = THEMES.home;
let musicTimer: number | undefined;
let nextBarTime = 0;
let barIndex = 0;

function ensureBus(c: AudioContext): GainNode {
  if (!musicGain) {
    musicGain = c.createGain();
    musicGain.gain.value = 0.0001;
    // Limiter so the layered notes + drums never clip at the louder master.
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -10;
    comp.knee.value = 8;
    comp.ratio.value = 12;
    comp.attack.value = 0.003;
    comp.release.value = 0.12;
    musicGain.connect(comp).connect(c.destination);
  }
  return musicGain;
}

function noise(c: AudioContext): AudioBuffer {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, Math.floor(c.sampleRate * 0.2), c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

function mNote(c: AudioContext, freq: number, start: number, dur: number, type: OscillatorType, peak: number) {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + Math.min(0.06, dur * 0.3));
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g).connect(musicGain!);
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

function kick(c: AudioContext, t: number, gain: number) {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.frequency.setValueAtTime(120, t);
  osc.frequency.exponentialRampToValueAtTime(45, t + 0.11);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
  osc.connect(g).connect(musicGain!);
  osc.start(t);
  osc.stop(t + 0.15);
}

function hihat(c: AudioContext, t: number, gain: number) {
  const src = c.createBufferSource();
  src.buffer = noise(c);
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 6500;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
  src.connect(hp).connect(g).connect(musicGain!);
  src.start(t);
  src.stop(t + 0.05);
}

function scheduleBar(c: AudioContext, t: number, th: Theme, chord: Chord) {
  mNote(c, chord.bass, t, th.barSec * 0.98, 'sine', th.bassGain);
  chord.pad.forEach((f) => mNote(c, f, t, th.barSec * 0.98, th.padType, th.padGain));
  const sub = th.barSec / th.arpDiv;
  const pat = [0, 1, 2, 1, 0, 2, 1, 2];
  for (let i = 0; i < th.arpDiv; i++) {
    const f = chord.pad[pat[i % pat.length] % chord.pad.length] * 2;
    mNote(c, f, t + i * sub, sub * 0.9, th.arpType, th.arpGain);
  }
  const beat = th.barSec / 4;
  th.kickBeats.forEach((b) => kick(c, t + b * beat, th.drumGain));
  for (let e = 0; e < 8; e++) hihat(c, t + e * (th.barSec / 8), th.drumGain * 0.35);
}

function pump() {
  if (!musicPlaying) return;
  const c = ac();
  if (!c) return;
  // small lookahead so a theme change takes effect within ~1 bar
  while (nextBarTime < c.currentTime + theme.barSec * 1.25) {
    scheduleBar(c, nextBarTime, theme, theme.prog[barIndex % theme.prog.length]);
    nextBarTime += theme.barSec;
    barIndex++;
  }
  musicTimer = window.setTimeout(pump, theme.barSec * 380);
}

function fadeMaster(c: AudioContext, target: number, dur: number) {
  const g = musicGain!.gain;
  g.cancelScheduledValues(c.currentTime);
  g.setValueAtTime(Math.max(g.value, 0.0001), c.currentTime);
  g.exponentialRampToValueAtTime(Math.max(target, 0.0001), c.currentTime + dur);
}

/** Switch the looping bed to a theme ('home' | 'game' | 'result'). */
export function playTheme(name: keyof typeof THEMES) {
  const c = ac();
  if (!c || !enabled) return;
  if (currentTheme === name && musicPlaying) return;
  ensureBus(c);
  currentTheme = name;
  theme = THEMES[name];
  barIndex = 0; // restart this theme's progression
  if (!musicPlaying) {
    musicPlaying = true;
    nextBarTime = c.currentTime + 0.12;
    fadeMaster(c, MUSIC_MASTER, 0.4);
    pump();
  }
}

export function stopMusic() {
  musicPlaying = false;
  currentTheme = '';
  if (musicTimer) window.clearTimeout(musicTimer);
  if (musicGain && ctx) fadeMaster(ctx, 0.0001, 0.4);
}
