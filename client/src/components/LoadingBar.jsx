// client/src/components/LoadingBar.jsx
// An obvious, colorful animated loading overlay shown during async events
// (surprise start, world creation, character save). Indeterminate shimmer bar.

export default function LoadingBar({ message = 'Loading…', subMessage }) {
  return (
    <div style={S.overlay}>
      <div style={S.card}>
        <div style={S.message}>{message}</div>
        <div style={S.track}>
          <div style={S.fill} />
        </div>
        {subMessage && <div style={S.sub}>{subMessage}</div>}
        <style>{`
          @keyframes iwSlide {
            0%   { transform: translateX(-100%); }
            100% { transform: translateX(250%); }
          }
          @keyframes iwPulse {
            0%,100% { opacity: 0.85; }
            50%     { opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
}

const S = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 600,
    background: 'radial-gradient(ellipse at center, rgba(20,8,40,0.92) 0%, rgba(0,0,0,0.96) 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    fontFamily: 'system-ui, sans-serif',
  },
  card: { width: '100%', maxWidth: 380, textAlign: 'center' },
  message: {
    color: '#fff', fontSize: 18, fontWeight: 800, marginBottom: 20,
    animation: 'iwPulse 1.6s ease-in-out infinite',
    textShadow: '0 0 20px rgba(204,136,255,0.6)',
  },
  track: {
    position: 'relative', width: '100%', height: 10, borderRadius: 6, overflow: 'hidden',
    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(204,136,255,0.25)',
  },
  fill: {
    position: 'absolute', top: 0, left: 0, height: '100%', width: '40%', borderRadius: 6,
    background: 'linear-gradient(90deg, #ff9a3c 0%, #cc3a8a 40%, #cc88ff 70%, #88ddff 100%)',
    boxShadow: '0 0 16px rgba(204,136,255,0.8)',
    animation: 'iwSlide 1.1s ease-in-out infinite',
  },
  sub: { color: 'rgba(200,170,255,0.75)', fontSize: 13, marginTop: 16, fontStyle: 'italic', lineHeight: 1.5 },
};
