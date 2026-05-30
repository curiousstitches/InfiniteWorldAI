// client/src/components/CreditsModal.jsx
// Acknowledges the creator + invites developers to build on the project under simple terms.

const REPO_URL = 'https://github.com/curiousstitches/InfiniteWorldAI';
const ISSUES_URL = 'https://github.com/curiousstitches/InfiniteWorldAI/issues/new';
const CREATOR = 'curiousstitches';

export default function CreditsModal({ onClose }) {
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.card} onClick={e => e.stopPropagation()}>
        <button style={S.close} onClick={onClose} aria-label="Close">×</button>

        <div style={S.badge}>✦ CREDITS &amp; CONTRIBUTORS</div>
        <h2 style={S.title}>InfiniteWorldAI</h2>
        <p style={S.creator}>Created by <b>{CREATOR}</b></p>

        <p style={S.p}>
          This is an open vision — a never-ending, voice-driven AI world where your companion
          and surroundings are born from conversation. Developers are warmly invited to build
          on it, fork it, and push it further.
        </p>

        <div style={S.terms}>
          <div style={S.termsH}>If you build on this, please:</div>
          <div style={S.termRow}>① <b>Tag me</b> in your project so I can see where it's going.</div>
          <div style={S.termRow}>② <b>Send ideas &amp; fixes</b> to the GitHub repo — I'll review them and
            acknowledge everyone who helps move the vision forward.</div>
          <div style={S.termRow}>③ Credit for the <b>base idea</b> remains with the original
            creator. All credited fixes will be acknowledged here.</div>
        </div>

        <div style={S.linkRow}>
          <a style={S.linkPrimary} href={REPO_URL} target="_blank" rel="noreferrer">↗ View / Fork on GitHub</a>
          <a style={S.linkSecondary} href={ISSUES_URL} target="_blank" rel="noreferrer">＋ Submit an idea or fix</a>
        </div>

        <div style={S.ackH}>Acknowledged contributors</div>
        <div style={S.ackNote}>
          Credited fixes and ideas will appear here as the project grows. Be the first —
          open a pull request or issue.
        </div>

        <button style={S.gotIt} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

const S = {
  overlay: { position: 'fixed', inset: 0, zIndex: 250, background: 'rgba(5,2,15,0.85)',
    backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16, fontFamily: 'system-ui, sans-serif', overflowY: 'auto' },
  card: { position: 'relative', width: '100%', maxWidth: 440, maxHeight: '88vh', overflowY: 'auto',
    background: 'linear-gradient(160deg,#1e0a42 0%,#0a0418 100%)',
    border: '1px solid rgba(204,136,255,0.35)', borderRadius: 18, padding: 26,
    boxShadow: '0 0 70px rgba(120,40,200,0.4)' },
  close: { position: 'absolute', top: 12, right: 16, background: 'none', border: 'none',
    color: 'rgba(220,200,255,0.6)', fontSize: 28, lineHeight: 1, cursor: 'pointer' },
  badge: { display: 'inline-block', fontSize: 10, fontWeight: 800, letterSpacing: 1.5,
    color: '#88ddff', background: 'rgba(136,221,255,0.12)', border: '1px solid rgba(136,221,255,0.3)',
    borderRadius: 12, padding: '3px 10px', marginBottom: 12 },
  title: { fontFamily: "'Cinzel Decorative', serif",
    background: 'linear-gradient(90deg,#ff9a3c,#cc3a8a,#cc88ff,#88ddff)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
    fontSize: 26, fontWeight: 800, margin: '0 0 4px' },
  creator: { color: 'rgba(220,200,255,0.9)', fontSize: 15, margin: '0 0 16px' },
  p: { color: 'rgba(220,200,255,0.85)', fontSize: 14, lineHeight: 1.6, margin: '0 0 16px' },
  terms: { background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(204,136,255,0.2)',
    borderRadius: 12, padding: 14, marginBottom: 16 },
  termsH: { color: '#cc88ff', fontSize: 13, fontWeight: 700, marginBottom: 10 },
  termRow: { color: 'rgba(224,208,255,0.9)', fontSize: 13.5, lineHeight: 1.6, marginBottom: 10 },
  linkRow: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 },
  linkPrimary: { display: 'block', textAlign: 'center', padding: '13px', borderRadius: 12,
    background: 'linear-gradient(135deg,#cc88ff 0%,#7a3acc 100%)', color: '#0a0218',
    fontSize: 14.5, fontWeight: 800, textDecoration: 'none' },
  linkSecondary: { display: 'block', textAlign: 'center', padding: '12px', borderRadius: 12,
    background: 'transparent', border: '1px solid rgba(204,136,255,0.4)', color: '#cc88ff',
    fontSize: 14, fontWeight: 700, textDecoration: 'none' },
  ackH: { color: '#cc88ff', fontSize: 13, fontWeight: 700, marginBottom: 6, letterSpacing: 1 },
  ackNote: { color: 'rgba(200,170,255,0.6)', fontSize: 12.5, lineHeight: 1.5, marginBottom: 18, fontStyle: 'italic' },
  gotIt: { width: '100%', background: 'linear-gradient(135deg,#cc88ff 0%,#7a3acc 100%)',
    border: 'none', color: '#0a0218', borderRadius: 12, padding: '13px', fontSize: 15, fontWeight: 800, cursor: 'pointer' },
};
