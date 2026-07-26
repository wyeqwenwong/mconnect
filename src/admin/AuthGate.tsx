import { useState } from 'react';
import { MetaLogo } from '../game/components/MetaLogo';

// Placeholder admin gate. In production this is Supabase Auth (GDD §9); here a
// passcode stands in so the console is not wide open in a shared demo. Set
// VITE_ADMIN_PASSCODE to override the default. NOT a security boundary on its own.
const PASSCODE = (import.meta.env.VITE_ADMIN_PASSCODE as string) || 'connect2026';

export function AuthGate({ onAuthed }: { onAuthed: () => void }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value === PASSCODE) {
      sessionStorage.setItem('mcc.admin', '1');
      onAuthed();
    } else {
      setError(true);
    }
  };

  return (
    <div className="auth">
      <form className="auth__card" onSubmit={submit}>
        <MetaLogo width={140} height={48} />
        <h1 className="auth__title">Settings Console</h1>
        <p className="auth__sub">Event owner sign-in</p>
        <input
          className={'auth__input' + (error ? ' auth__input--error' : '')}
          type="password"
          placeholder="Passcode"
          value={value}
          autoFocus
          onChange={(e) => {
            setValue(e.target.value);
            setError(false);
          }}
        />
        {error && <div className="auth__error">Incorrect passcode.</div>}
        <button className="btn btn--primary auth__btn" type="submit">
          Sign in
        </button>
        <p className="auth__hint">Demo passcode: connect2026</p>
      </form>
    </div>
  );
}
