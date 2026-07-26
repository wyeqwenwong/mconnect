import { useEffect, useState } from 'react';
import { store, subscribe } from '../lib/store';

export function PanelsView() {
  const [online, setOnline] = useState(0);

  useEffect(() => {
    const load = () => store.getOnlinePanels().then(setOnline);
    load();
    const iv = setInterval(load, 3000);
    const unsub = subscribe('panels', load);
    return () => {
      clearInterval(iv);
      unsub();
    };
  }, []);

  return (
    <div className="panels">
      <h1 className="section-title">Panels</h1>
      <div className="card panels-card">
        <div className="panels-big">
          <span className="pill-online">● {online}</span> panel{online === 1 ? '' : 's'} online
        </div>
        <p className="panels-desc">
          Each kiosk sends a heartbeat every few seconds. A panel counts as online if it has checked in
          within the last 15 seconds. Open the game client in another browser tab to simulate an
          additional kiosk sharing this leaderboard.
        </p>
        <div className="panels-note">
          {store.isRemote
            ? 'Connected to remote backend (Supabase/Vercel).'
            : 'Local mode — panels + leaderboard sync across tabs on this machine via BroadcastChannel.'}
        </div>
      </div>
    </div>
  );
}
