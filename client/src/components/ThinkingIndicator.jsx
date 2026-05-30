// client/src/components/ThinkingIndicator.jsx
// A large, obvious "the companion is thinking" indicator shown while an AI reply is
// being generated. Animated pulsing orb + bouncing dots so slow responses feel alive.

export default function ThinkingIndicator({ name = 'Companion' }) {
  return (
    <div style={S.wrap}>
      <div style={S.bubble}>
        <div style={S.orb} />
        <span style={S.label}>{name} is thinking</span>
        <span style={S.dots}>
          <span style={{ ...S.dot, animationDelay: '0ms' }} />
          <span style={{ ...S.dot, animationDelay: '160ms' }} />
          <span style={{ ...S.dot, animationDelay: '320ms' }} />
        </span>
      </div>
      <style>{`
        @keyframes iwThinkPulse { 0%,100%{transform:scale(1);opacity:0.9} 50%{transform:scale(1.25);opacity:1} }
        @keyframes iwThinkBounce { 0%,80%,100%{transform:translateY(0);opacity:0.5} 40%{transform:translateY(-7px);opacity:1} }
        @keyframes iwThinkGlow { 0%,100%{box-shadow:0 0 20px rgba(204,136,255,0.5)} 50%{box-shadow:0 0 36px rgba(136,221,255,0.8)} }
      `}</style>
    </div>
  );
}

const S = {
  wrap: {
    position: 'fixed', bottom: 150, left: '50%', transform: 'translateX(-50%)',
    zIndex: 60, pointerEvents: 'none', fontFamily: 'system-ui, sans-serif',
  },
  bubble: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '14px 22px', borderRadius: 999,
    background: 'linear-gradient(135deg, rgba(40,18,80,0.95), rgba(20,10,45,0.95))',
    border: '1.5px solid rgba(204,136,255,0.5)',
    backdropFilter: 'blur(10px)',
    animation: 'iwThinkGlow 1.8s ease-in-out infinite',
  },
  orb: {
    width: 18, height: 18, borderRadius: '50%',
    background: 'radial-gradient(circle at 30% 30%, #e8c0ff, #cc88ff 40%, #7a3acc)',
    animation: 'iwThinkPulse 1.2s ease-in-out infinite',
  },
  label: { color: '#f0e0ff', fontSize: 15, fontWeight: 700, letterSpacing: 0.3 },
  dots: { display: 'inline-flex', gap: 4, alignItems: 'flex-end' },
  dot: {
    width: 7, height: 7, borderRadius: '50%', background: '#88ddff',
    display: 'inline-block', animation: 'iwThinkBounce 1.2s ease-in-out infinite',
  },
};
