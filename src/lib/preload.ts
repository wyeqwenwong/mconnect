// Preload + decode game image assets so screen transitions don't flash while a
// large full-bleed background loads. The entry screen's assets are treated as
// critical (the app waits on them behind a splash); the rest warm the cache in
// the background while the player is on the entry screen.
import { asset } from './assets';

const CRITICAL = ['bg-v2.png', 'meta-logo.png', 'heading.png', 'subhead.png', 'start-v2.png', 'leaf1.png', 'leaf2.png', 'leaf3.png'];

// Load the results art right after critical so it's warm before it's needed.
const IMPORTANT = ['correct.png', 'medal1.png', 'medal2.png', 'medal3.png', 'medal4.png'];

const REST = ['play-again.png', 'share-score.png'];

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
