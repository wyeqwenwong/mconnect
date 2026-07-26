// Placeholder Meta lockup. README §4: the official Meta logo requires Brand
// Review approval — drop the approved asset in here (swap for an <img>).
export function MetaLogo({ width = 280, height = 94, onWhiteChip = false }: {
  width?: number;
  height?: number;
  onWhiteChip?: boolean;
}) {
  const infinity = (
    <svg viewBox="0 0 48 24" width={height * 0.55} height={height * 0.28} aria-hidden>
      <path
        d="M12 4C5.5 4 2 9 2 12s3.5 8 10 8c5 0 8-5 10-8 2-3 5-8 10-8 6.5 0 10 5 10 8s-3.5 8-10 8c-5 0-8-5-10-8"
        fill="none"
        stroke="#0064e0"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
  return (
    <div
      className="meta-logo"
      style={{
        width,
        height,
        background: onWhiteChip ? '#fff' : 'transparent',
        borderRadius: onWhiteChip ? 12 : 0,
        padding: onWhiteChip ? '6px 14px' : 0,
      }}
      role="img"
      aria-label="Meta"
    >
      {infinity}
      <span className="meta-logo__word">Meta</span>
    </div>
  );
}
