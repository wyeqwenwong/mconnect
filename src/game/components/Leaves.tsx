import { asset } from '../../lib/assets';

// Decorative green "leaf" clusters (assetv2 Element1–3) placed in the corners,
// matching the Kiosk_v1_2 mockups. Purely cosmetic; never interactive.
export function Leaves() {
  return (
    <>
      <img
        src={asset('leaf2.png')}
        className="leaf"
        style={{ top: -70, right: -80, width: 360, transform: 'rotate(-8deg)' }}
        alt=""
        aria-hidden
      />
      <img
        src={asset('leaf3.png')}
        className="leaf"
        style={{ top: 690, right: -150, width: 430, transform: 'rotate(12deg)' }}
        alt=""
        aria-hidden
      />
      <img
        src={asset('leaf1.png')}
        className="leaf"
        style={{ bottom: -60, left: -90, width: 480, transform: 'rotate(6deg)' }}
        alt=""
        aria-hidden
      />
    </>
  );
}
