import { useEffect, useState, type ReactNode } from 'react';

const DESIGN_W = 1080;
const DESIGN_H = 1920;

/**
 * Renders children on a fixed 1080×1920 portrait canvas (the design authoring
 * size) and scales it with `transform` to fit the current viewport, letterboxed
 * and centered on a dark backdrop. On a real portrait kiosk it fills the screen;
 * on a desktop browser it shows the portrait panel scaled down.
 */
export function KioskStage({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  return (
    <div className="stage-backdrop kiosk-no-select">
      <div
        className="stage"
        style={{
          width: DESIGN_W,
          height: DESIGN_H,
          transform: `translate(-50%, -50%) scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
