import { useEffect, useState } from 'preact/hooks';

export function App() {
  const [boot, setBoot] = useState<string>('GREY HERON — booting…');
  useEffect(() => {
    setBoot(`GREY HERON v0.1 — ${new Date().toISOString()}`);
  }, []);
  return (
    <div style="padding: 16px; display: flex; flex-direction: column; gap: 12px;">
      <h1 style="margin:0; color: var(--gh-accent); font-size: 18px;">GREY HERON</h1>
      <p style="margin: 0;">{boot}</p>
      <p style="margin: 0; color: var(--gh-muted);">
        M0 placeholder shell. Missions, terminal, and hub will arrive in M2/M3.
      </p>
      <p style="margin: 0; color: var(--gh-warn);">
        Status: simulator only — no real scanning, no network calls, no working exploits.
      </p>
    </div>
  );
}