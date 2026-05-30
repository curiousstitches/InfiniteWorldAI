// client/src/components/WakingOverlay.jsx
// The "coming to" intro: combined eyelid blink + blur-to-focus fade, with a ghostly
// cursive phrase that sweeps left→right like smoke. Phrase matches how the session began
// (amnesia / new / continue). Non-blocking: fades out and never interrupts gameplay.

import { useEffect, useState } from 'react';

const PHRASES = {
  amnesia:  ['Coming to…', 'Where… am I…', 'Stirring awake…', 'Reality returns…'],
  surprise: ['Coming to…', 'Blinking awake…', 'The world swims into focus…'],
  new:      ['Dreaming you awake…', 'Opening your eyes…', 'A world takes shape…'],
  continue: ['Welcome back…', 'Stepping back in…', 'Picking up the thread…'],
  default:  ['Loading…', 'Awakening…'],
};

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export default function WakingOverlay({ mode = 'default', onDone }) {
  const [phrase] = useState(() => pick(PHRASES[mode] || PHRASES.default));
  const [phase, setPhase] = useState('wake'); // wake → fading → gone

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('fading'), 2600);
    const t2 = setTimeout(() => { setPhase('gone'); onDone?.(); }, 3600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  if (phase === 'gone') return null;

  return (
    <div style={{ ...S.overlay, opacity: phase === 'fading' ? 0 : 1 }}>
      {/* Eyelids: dark bars closing in from top & bottom, opening as we wake */}
      <div style={{ ...S.lid, ...S.lidTop }} />
      <div style={{ ...S.lid, ...S.lidBottom }} />

      {/* Blur-to-focus veil */}
      <div style={S.veil} />

      {/* Ghostly cursive phrase sweeping in from the left */}
      <div style={S.phraseWrap}>
        <span style={S.phrase}>{phrase}</span>
      </div>

      <style>{`
        @keyframes iwLidOpenTop    { 0%{transform:translateY(0)} 100%{transform:translateY(-100%)} }
        @keyframes iwLidOpenBottom { 0%{transform:translateY(0)} 100%{transform:translateY(100%)} }
        @keyframes iwBlink {
          0%{opacity:1} 12%{opacity:1} 18%{opacity:0.2} 24%{opacity:1}
          55%{opacity:0.15} 62%{opacity:1} 100%{opacity:0}
        }
        @keyframes iwUnblur { 0%{backdrop-filter:blur(18px);filter:brightness(0.4)} 100%{backdrop-filter:blur(0);filter:brightness(1)} }
        @keyframes iwSweep {
          0%   { opacity:0; transform:translateX(-40vw) skewX(-8deg); letter-spacing:18px; filter:blur(8px); }
          40%  { opacity:0.9; filter:blur(1.5px); }
          70%  { opacity:0.9; }
          100% { opacity:0; transform:translateX(40vw) skewX(-8deg); letter-spacing:2px; filter:blur(6px); }
        }
      `}</style>
    </div>
  );
}

const S = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 450, pointerEvents: 'none',
    transition: 'opacity 1s ease', overflow: 'hidden',
    animation: 'iwUnblur 2.6s ease-out forwards',
  },
  lid: { position: 'absolute', left: 0, right: 0, height: '52%',
    background: 'linear-gradient(to var(--d), #000 60%, rgba(0,0,0,0.4))', zIndex: 2 },
  lidTop:    { top: 0,    background: 'linear-gradient(to bottom, #000 55%, transparent)', animation: 'iwLidOpenTop 2.4s ease-out forwards' },
  lidBottom: { bottom: 0, background: 'linear-gradient(to top, #000 55%, transparent)',    animation: 'iwLidOpenBottom 2.4s ease-out forwards' },
  veil: { position: 'absolute', inset: 0, background: 'rgba(6,2,16,0.5)', zIndex: 1,
    animation: 'iwBlink 2.6s ease-in-out forwards' },
  phraseWrap: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3 },
  phrase: {
    fontFamily: "'Crimson Pro', Georgia, serif", fontStyle: 'italic',
    fontSize: 'clamp(28px, 8vw, 52px)', color: 'rgba(230,220,255,0.9)',
    textShadow: '0 0 24px rgba(180,150,255,0.7), 0 0 8px rgba(255,255,255,0.4)',
    whiteSpace: 'nowrap', animation: 'iwSweep 3s ease-in-out forwards',
  },
};
