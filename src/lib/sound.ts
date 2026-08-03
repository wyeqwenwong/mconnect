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

/** Call from a user gesture to unlock audio on kiosk (SFX context + music). */
export function unlockAudio() {
  ac();
  primeMusic();
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
    [660, 990, 1320].forEach((f, i) => tone(f, i * 0.09, 0.16, 'sawtooth', 0.3));
  },
  /** Per-second countdown beep for the last 10s — rises in pitch + volume as
   *  the clock runs down; doubles up under 3s for extra tension. A bright
   *  octave harmonic rides on top so it cuts through the ducked music bed. */
  countdown(sec: number) {
    if (!enabled) return;
    const step = 10 - Math.max(0, Math.min(10, sec));
    const f = 620 + step * 60;
    const g = Math.min(0.42, 0.22 + step * 0.026);
    tone(f, 0, 0.1, 'square', g); // fundamental
    tone(f * 2, 0, 0.07, 'square', g * 0.4); // octave harmonic for presence/cut
    if (sec <= 3) tone(f * 1.5, 0.1, 0.08, 'square', g * 0.8); // urgent double under 3s
  },
};

// ============================================================
//  Looping music engine — real produced tracks (royalty-free)
// ------------------------------------------------------------
//  One energetic track per page (home / game / result), crossfaded on switch.
//  The mp3s are imported so Vite fingerprints + bundles them into the app (they
//  ship inside the .exe's app.asar and on Vercel — nothing streams from a music
//  service). Music by Kevin MacLeod (incompetech.com), CC BY — see CREDITS.md.
// ============================================================
import homeUrl from '../assets/audio/home.mp3';
import gameUrl from '../assets/audio/game.mp3';
import resultUrl from '../assets/audio/result.mp3';

const TRACKS: Record<string, string> = { home: homeUrl, game: gameUrl, result: resultUrl };
export type ThemeName = keyof typeof TRACKS;

const MUSIC_VOL = 0.62; // loud enough for a booth, leaves headroom for SFX
const FADE_MS = 600;

const players: Partial<Record<string, HTMLAudioElement>> = {};
let currentTheme = '';
const fadeTimers: Partial<Record<string, number>> = {};

function player(name: string): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  let a = players[name];
  if (!a) {
    a = new Audio(TRACKS[name]);
    a.loop = true;
    a.preload = 'auto';
    a.volume = 0;
    players[name] = a;
  }
  return a;
}

function fade(a: HTMLAudioElement, target: number, ms: number, pauseAtEnd = false) {
  const key = a.src;
  if (fadeTimers[key]) window.clearInterval(fadeTimers[key]);
  const from = a.volume;
  const steps = Math.max(1, Math.round(ms / 40));
  let i = 0;
  fadeTimers[key] = window.setInterval(() => {
    i++;
    const v = from + (target - from) * (i / steps);
    a.volume = Math.max(0, Math.min(1, v));
    if (i >= steps) {
      window.clearInterval(fadeTimers[key]);
      fadeTimers[key] = undefined;
      if (pauseAtEnd && target === 0) a.pause();
    }
  }, 40);
}

/** Instantiate the track elements (start buffering) on the first user gesture.
 *  Playback itself is driven by playTheme(); the gesture grants sticky user
 *  activation so those play() calls are allowed on the web build. (In the
 *  Electron kiosk autoplay is allowed outright — see electron/main.cjs.) We do
 *  NOT play/pause here — that would race with the playTheme() the app fires for
 *  the current page and could silence it. */
function primeMusic() {
  (Object.keys(TRACKS) as string[]).forEach((name) => player(name));
}

/** Switch the looping bed to a page theme, crossfading from the current one. */
export function playTheme(name: ThemeName) {
  if (typeof window === 'undefined' || !enabled) return;
  if (currentTheme === name) {
    const cur = player(name);
    if (cur && cur.paused) void cur.play().catch(() => {});
    return;
  }
  const prev = currentTheme;
  currentTheme = name;
  ducked = false; // a new page's bed always starts at full volume
  const next = player(name);
  if (next) {
    void next.play().catch(() => {});
    fade(next, MUSIC_VOL, FADE_MS);
  }
  if (prev && players[prev]) fade(players[prev]!, 0, FADE_MS, true);
}

export function stopMusic() {
  currentTheme = '';
  ducked = false;
  (Object.keys(players) as string[]).forEach((k) => {
    const a = players[k];
    if (a) fade(a, 0, FADE_MS, true);
  });
}

// ---- ducking: dip the background bed so the countdown cuts through ----------
let ducked = false;
const DUCK_VOL = MUSIC_VOL * 0.25;

/** Lower the current music bed (call when the final-seconds countdown starts). */
export function duckMusic() {
  ducked = true;
  const a = currentTheme ? players[currentTheme] : undefined;
  if (a && !a.paused) fade(a, DUCK_VOL, 220);
}

/** Restore the music bed to full volume (call when the countdown ends). */
export function unduckMusic() {
  if (!ducked) return;
  ducked = false;
  const a = currentTheme ? players[currentTheme] : undefined;
  if (a && !a.paused) fade(a, MUSIC_VOL, 400);
}
