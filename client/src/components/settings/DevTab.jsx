// client/src/components/settings/DevTab.jsx
// Developer Mode: toggles the on-screen engine debug log (off by default — only for
// diagnosing problems). Also links to the contributor/acknowledgment info.

import { useSettingsStore } from '../../store/settingsStore.js';

const REPO_URL = 'https://github.com/curiousstitches/InfiniteWorldAI';
const ISSUES_URL = 'https://github.com/curiousstitches/InfiniteWorldAI/issues/new';

export default function DevTab() {
  const ui = useSettingsStore(s => s.ui);
  const setUi = useSettingsStore(s => s.setUi);

  return (
    <div>
      {/* Developer Mode toggle */}
      <div style={S.section}>
        <div style={S.h}>DEVELOPER MODE</div>
        <label style={S.toggleRow}>
          <div style={S.toggleText}>
            <div style={S.toggleTitle}>Show debug messages</div>
            <div style={S.toggleDesc}>
              Displays a live engine log on screen (GPU, scene, render steps) with copy &amp;
              download. <b>Only turn this on if you're hunting a problem</b> — like a black
              screen or a part that won't load. Leave it off for normal play.
            </div>
          </div>
          <input
            type="checkbox"
            checked={!!ui.devMode}
            onChange={e => setUi({ devMode: e.target.checked })}
            style={S.checkbox}
          />
        </label>
      </div>

      {/* Memory note */}
      <div style={S.section}>
        <div style={S.h}>MEMORY &amp; SYNC</div>
        <div style={{ color: 'rgba(200,180,255,0.7)', fontSize: 13, lineHeight: 1.5 }}>
          Without an account, your companion's long-term memory lives only in <b>this</b> browser —
          switching phones or clearing your browser will reset it. <b>Sign in</b> (on the home screen)
          to sync your companion + worlds across devices.
        </div>
      </div>

      {/* Reset everything */}
      <div style={S.section}>
        <div style={S.h}>RESET</div>
        <div style={{ color: 'rgba(200,180,255,0.7)', fontSize: 13, marginBottom: 10, lineHeight: 1.5 }}>
          Clears saved worlds, companion memory, stats, provider choice, and login on this device.
          Good for a clean test. This can't be undone.
        </div>
        <button
          style={{ width: '100%', padding: '13px', borderRadius: 10, cursor: 'pointer', border: '1px solid rgba(255,100,100,0.5)',
            background: 'rgba(255,60,60,0.15)', color: '#ff9b9b', fontSize: 14, fontWeight: 800 }}
          onClick={() => {
            if (!confirm('Reset everything on this device? This clears saved worlds, memory, stats, and login.')) return;
            try {
              Object.keys(localStorage).filter(k => k.startsWith('iw_')).forEach(k => localStorage.removeItem(k));
            } catch {}
            window.location.reload();
          }}
        >⚠ Reset everything</button>
      </div>

      {/* Contributor / acknowledgment */}
      <div style={S.section}>
        <div style={S.h}>FOR DEVELOPERS</div>
        <p style={S.p}>
          Want to build on InfiniteWorldAI or fork it as your own? You're welcome to — with a
          few asks:
        </p>
        <ul style={S.ul}>
          <li style={S.li}>Please <b>tag me</b> in your project so I can follow where it goes.</li>
          <li style={S.li}>Send ideas &amp; fixes to the GitHub repo so I can see them and
            acknowledge the people who help move the vision forward.</li>
          <li style={S.li}>Credit for the <b>base idea</b> stays with the original creator;
            all credited fixes will be acknowledged.</li>
        </ul>
        <div style={S.linkRow}>
          <a style={S.linkBtn} href={REPO_URL} target="_blank" rel="noreferrer">↗ Project on GitHub</a>
          <a style={S.linkBtn} href={ISSUES_URL} target="_blank" rel="noreferrer">＋ Submit an idea / fix</a>
        </div>
      </div>
    </div>
  );
}

const S = {
  section: { background: 'rgba(40,18,80,0.3)', border: '1px solid rgba(160,80,255,0.25)',
    borderRadius: 12, padding: 16, marginBottom: 16 },
  h: { color: '#cc88ff', fontSize: 13, fontWeight: 800, letterSpacing: 1.5, marginBottom: 12 },
  toggleRow: { display: 'flex', alignItems: 'flex-start', gap: 14, cursor: 'pointer' },
  toggleText: { flex: 1 },
  toggleTitle: { color: '#f0e8ff', fontSize: 15, fontWeight: 700, marginBottom: 4 },
  toggleDesc: { color: 'rgba(200,180,255,0.7)', fontSize: 13, lineHeight: 1.55 },
  checkbox: { width: 26, height: 26, accentColor: '#cc88ff', flexShrink: 0, cursor: 'pointer', marginTop: 2 },
  p: { color: 'rgba(220,200,255,0.85)', fontSize: 14, lineHeight: 1.6, margin: '0 0 10px' },
  ul: { margin: '0 0 14px', paddingLeft: 18 },
  li: { color: 'rgba(220,200,255,0.85)', fontSize: 13.5, lineHeight: 1.7, marginBottom: 8 },
  linkRow: { display: 'flex', flexDirection: 'column', gap: 8 },
  linkBtn: { display: 'block', textAlign: 'center', padding: '12px', borderRadius: 10,
    background: 'linear-gradient(135deg,#cc88ff 0%,#7a3acc 100%)', color: '#0a0218',
    fontSize: 14, fontWeight: 800, textDecoration: 'none' },
};
