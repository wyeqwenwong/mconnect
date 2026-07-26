// Preload + decode game image assets so screen transitions don't flash while a
// large full-bleed background loads. The entry screen's assets are treated as
// critical (the app waits on them behind a splash); the rest warm the cache in
// the background while the player is on the entry screen.
import { asset } from './assets';

const CRITICAL = ['bg1.png', 'logo.png', 'wordmark.png', 'name-box.png', 'start.png', 'dot.png', 'pacman.png'];

// The Top 5 podium art is heavy and, if it loads late, the rank numbers briefly
// sit on the bare background (looking off-centre). Load it right after critical
// and before it's ever needed.
const IMPORTANT = ['leaderboard-bg.png', 'colorbar.png', 'logo-white.png'];

const REST = [
  'bg2.png',
  'bg3.png',
  'next.png',
  'tick-green.png',
  'tick-pink.png',
  'tick-purple.png',
  'icon-audience.png',
  'icon-budget.png',
  'icon-creative.png',
  'icon-placements.png',
  'icon-shopping.png',
];

function load(name: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = asset(name);
    const done = () => resolve();
    if (img.decode) img.decode().then(done, done);
    else {
      img.onload = done;
      img.onerror = done;
    }
  });
}

/** Resolves once entry-critical art is decoded (with a safety timeout). */
export function preloadCritical(): Promise<unknown> {
  const all = Promise.all(CRITICAL.map(load));
  const timeout = new Promise((r) => setTimeout(r, 2500));
  return Promise.race([all, timeout]);
}

/** Warm the podium art (first) then the rest; never blocks the UI. */
export function preloadRest(): void {
  IMPORTANT.forEach(load);
  REST.forEach(load);
}
