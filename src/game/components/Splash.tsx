import { asset } from '../../lib/assets';

// Brief branded splash shown while entry-critical art decodes.
export function Splash() {
  return (
    <div className="splash">
      <img src={asset('logo.png')} className="splash__logo" alt="Meta" />
      <div className="splash__dots">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
