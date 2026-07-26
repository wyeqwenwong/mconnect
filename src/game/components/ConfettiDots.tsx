// Small scattered pastel dots — decorative accent on score screens (README §5.4).
const DOTS = [
  { top: 140, left: 150, size: 30, color: 'var(--pink)', opacity: 1 },
  { top: 300, right: 180, size: 24, color: 'var(--meta-blue)', opacity: 0.35 },
  { top: 520, left: 90, size: 18, color: 'var(--coral)', opacity: 0.7 },
  { bottom: 380, right: 240, size: 28, color: 'var(--success)', opacity: 0.5 },
  { bottom: 260, left: 190, size: 22, color: 'var(--pink)', opacity: 1 },
  { bottom: 520, right: 120, size: 16, color: 'var(--meta-blue)', opacity: 0.3 },
];

export function ConfettiDots() {
  return (
    <>
      {DOTS.map((d, i) => (
        <span
          key={i}
          className="confetti-dot"
          style={{
            top: d.top,
            left: d.left,
            right: d.right,
            bottom: d.bottom,
            width: d.size,
            height: d.size,
            background: d.color,
            opacity: d.opacity,
          }}
        />
      ))}
    </>
  );
}
