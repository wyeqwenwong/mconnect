import { asset } from '../../lib/assets';

// Small rounded "sticker" blob with a tiny face — CSS stand-in for the final
// sticker art (handoff §8). Colors: pink / green / teal / pastel.
export function Blob({
  color,
  face = '•—•',
  rotate = 0,
  style,
}: {
  color: string;
  face?: string;
  rotate?: number;
  style: React.CSSProperties;
}) {
  return (
    <div
      className="blob"
      style={{ background: color, transform: `rotate(${rotate}deg)`, ...style }}
    >
      {face}
    </div>
  );
}

export function Dot({ style }: { style: React.CSSProperties }) {
  return <img src={asset('dot.png')} className="decor" style={style} alt="" aria-hidden />;
}

export function Pacman({ style }: { style: React.CSSProperties }) {
  return <img src={asset('pacman.png')} className="decor" style={style} alt="" aria-hidden />;
}
