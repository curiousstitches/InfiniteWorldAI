import { useState, useEffect, useRef } from 'react';
import { useVoice } from '../hooks/useVoice.js';
import { useGameStore } from '../store/worldStore.js';
import { useSettingsStore } from '../store/settingsStore.js';

export default function VoiceInterface() {
  const { startListening, stopListening, sendTextInput, interrupt } = useVoice();
  const { isListening, isSpeaking, subtitles } = useGameStore();
  const { hideSubtitles, hideAllHud } = useSettingsStore(s => s.ui);
  const [textMode, setTextMode] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [dots, setDots] = useState(0);
  const canvasRef = useRef(null);
  const analyserRef = useRef(null);
  const animRef = useRef(null);

  // Waveform visualization
  useEffect(() => {
    if (!isListening) { cancelAnimationFrame(animRef.current); return; }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      src.connect(analyser);
      analyserRef.current = analyser;

      const draw = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const cctx = canvas.getContext('2d');
        const buf = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(buf);
        cctx.clearRect(0, 0, canvas.width, canvas.height);
        const barW = canvas.width / buf.length;
        buf.forEach((v, i) => {
          const h = (v / 255) * canvas.height;
          const alpha = 0.4 + (v / 255) * 0.6;
          cctx.fillStyle = `rgba(180,80,255,${alpha})`;
          cctx.fillRect(i * barW, canvas.height - h, barW - 1, h);
        });
        animRef.current = requestAnimationFrame(draw);
      };
      draw();
    }).catch(() => {});
    return () => cancelAnimationFrame(animRef.current);
  }, [isListening]);

  // Dot animation while speaking
  useEffect(() => {
    if (!isSpeaking) return;
    const id = setInterval(() => setDots(d => (d + 1) % 4), 300);
    return () => clearInterval(id);
  }, [isSpeaking]);

  const handleMicPress = () => { if (isListening) stopListening(); else startListening(); };
  const handleText = (e) => {
    if (e.key === 'Enter' && textInput.trim()) {
      sendTextInput(textInput);
      setTextInput('');
    }
  };

  const ring = isListening ? '0 0 0 3px rgba(180,80,255,0.6), 0 0 30px rgba(180,80,255,0.4)'
    : isSpeaking ? '0 0 0 3px rgba(80,200,255,0.6), 0 0 30px rgba(80,200,255,0.3)'
    : '0 0 0 1px rgba(255,255,255,0.1)';

  return (
    <div style={styles.container}>
      {/* Subtitles */}
      {!hideSubtitles && subtitles && (
        <div style={styles.subtitles}>
          <span style={isSpeaking ? styles.companionText : styles.playerText}>
            {subtitles}{isSpeaking ? '▪'.repeat(dots) : ''}
          </span>
        </div>
      )}

      {/* Waveform — suppressed in fullscreen-feel mode */}
      {!hideAllHud && isListening && (
        <canvas ref={canvasRef} width={200} height={40} style={styles.waveform} />
      )}

      <div style={styles.controls}>
        {/* Text toggle */}
        <button style={styles.smallBtn} onClick={() => setTextMode(m => !m)}>
          {textMode ? '🎤' : '⌨'}
        </button>

        {/* Main mic button */}
        {!textMode && (
          <button
            style={{ ...styles.micBtn, boxShadow: ring }}
            onPointerDown={handleMicPress}
            onPointerUp={isListening ? stopListening : undefined}
          >
            {isListening ? '◉' : isSpeaking ? '◈' : '◎'}
          </button>
        )}

        {/* Text input */}
        {textMode && (
          <input
            style={styles.textInput}
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            onKeyDown={handleText}
            placeholder="Type to speak..."
            autoFocus
          />
        )}

        {/* Interrupt */}
        {isSpeaking && (
          <button style={styles.smallBtn} onClick={interrupt}>✕</button>
        )}
      </div>

      <div style={styles.hint}>
        {isListening ? 'Listening...' : isSpeaking ? 'Companion speaking' : 'Hold to speak'}
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: 'fixed', bottom: 0, left: 0, right: 0,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '0 16px 24px', pointerEvents: 'none',
    fontFamily: "'Crimson Pro', serif",
  },
  subtitles: {
    maxWidth: 380, textAlign: 'center', marginBottom: 12,
    background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(12px)',
    padding: '8px 16px', borderRadius: 20, pointerEvents: 'none',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  playerText: { color: 'rgba(220,200,255,0.8)', fontSize: 14, fontStyle: 'italic' },
  companionText: { color: 'rgba(150,220,255,0.9)', fontSize: 15 },
  waveform: { marginBottom: 8, borderRadius: 8, opacity: 0.8 },
  controls: { display: 'flex', alignItems: 'center', gap: 12, pointerEvents: 'all' },
  micBtn: {
    width: 64, height: 64, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(100,30,200,0.9) 0%, rgba(60,10,140,0.95) 100%)',
    border: '1px solid rgba(180,100,255,0.5)', color: '#fff',
    fontSize: 24, cursor: 'pointer', transition: 'all 0.2s',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  smallBtn: {
    width: 40, height: 40, borderRadius: '50%',
    background: 'rgba(30,20,60,0.85)', border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(200,180,255,0.8)', fontSize: 16, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  textInput: {
    background: 'rgba(10,5,30,0.9)', border: '1px solid rgba(160,80,255,0.4)',
    borderRadius: 24, padding: '10px 18px', color: '#e0c8ff', fontSize: 15,
    width: 220, outline: 'none', fontFamily: "'Crimson Pro', serif",
  },
  hint: { marginTop: 6, color: 'rgba(180,150,220,0.4)', fontSize: 11, letterSpacing: 2 },
};
