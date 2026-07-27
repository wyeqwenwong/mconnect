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
    const fit = () => {
      const vw = window.visualViewport?.width ?? window.innerWidth;
      const vh = window.visualViewport?.height ?? window.innerHeight;
      setScale(Math.min(vw / DESIGN_W, vh / DESIGN_H));
    };
    fit();
    // Cover every way the display size can change on a kiosk/TV:
    // window resize, orientation change, and a ResizeObserver on the root
    // (fires even when a 'resize' event doesn't, e.g. embedded displays).
    window.addEventListener('resize', fit);
    window.addEventListener('orientationchange', fit);
    window.visualViewport?.addEventListener('resize', fit);
    const ro = new ResizeObserver(fit);
    ro.observe(document.documentElement);
    return () => {
      window.removeEventListener('resize', fit);
      window.removeEventListener('orientationchange', fit);
      window.visualViewport?.removeEventListener('resize', fit);
      ro.disconnect();
    };
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
