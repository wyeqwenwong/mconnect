import { useEffect, useState } from 'react';
import { MetaLogo } from '../game/components/MetaLogo';
import { store, subscribe } from '../lib/store';
import { QuestionPool } from './QuestionPool';
import { GameSettingsPanel } from './GameSettingsPanel';
import { LeaderboardView } from './LeaderboardView';
import { PanelsView } from './PanelsView';
import { AuthGate } from './AuthGate';

type Section = 'questions' | 'settings' | 'leaderboard' | 'panels';

const NAV: { id: Section; icon: string; label: string }[] = [
  { id: 'questions', icon: '❓', label: 'Question pool' },
  { id: 'settings', icon: '⚙️', label: 'Game settings' },
  { id: 'leaderboard', icon: '🏆', label: 'Leaderboard' },
  { id: 'panels', icon: '🖥', label: 'Panels' },
];

export function AdminApp() {
  const [authed, setAuthed] = useState(sessionStorage.getItem('mcc.admin') === '1');
  const [section, setSection] = useState<Section>('questions');
  const [online, setOnline] = useState(0);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (!authed) return;
    const load = () => store.getOnlinePanels().then(setOnline);
    load();
    const iv = setInterval(load, 4000);
    const unsub = subscribe('panels', load);
    return () => {
      clearInterval(iv);
      unsub();
    };
  }, [authed]);

  if (!authed) return <AuthGate onAuthed={() => setAuthed(true)} />;

  async function confirmReset() {
    if (!window.confirm('Reset the leaderboard? This clears all scores and cannot be undone.')) return;
    setResetting(true);
    await store.resetLeaderboard();
    setResetting(false);
    window.alert('Leaderboard cleared.');
  }

  return (
    <div className="admin">
      <header className="admin-header">
        <div className="admin-header__chip">
          <MetaLogo width={110} height={38} onWhiteChip />
        </div>
        <div className="admin-header__title">Connect &amp; Convert — Settings Console</div>
        <div className="admin-header__right">
          <span className="pill-online">● {online} panel{online === 1 ? '' : 's'} online</span>
          <span className="admin-header__account">admin@event</span>
        </div>
      </header>

      <div className="admin-body">
        <nav className="admin-nav">
          {NAV.map((n) => (
            <button
              key={n.id}
              className={'admin-nav__item' + (section === n.id ? ' is-active' : '')}
              onClick={() => setSection(n.id)}
            >
              <span aria-hidden>{n.icon}</span> {n.label}
            </button>
          ))}
          <button className="admin-danger" onClick={confirmReset} disabled={resetting}>
            <b>Reset leaderboard</b>
            <br />
            Clears all scores. Cannot be undone.
          </button>
        </nav>

        <main className="admin-main">
          {section === 'questions' && <QuestionPool />}
          {section === 'settings' && <GameSettingsPanel />}
          {section === 'leaderboard' && <LeaderboardView />}
          {section === 'panels' && <PanelsView />}
        </main>
      </div>
    </div>
  );
}
