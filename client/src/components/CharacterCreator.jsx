import { useState, useRef } from 'react';
import { useGameStore, useWorldStore } from '../store/worldStore.js';

const API = '/api';

const RACE_SUGGESTIONS = [
  'Human', 'Elf', 'Dwarf', 'Werewolf', 'Dragon (small)', 'Talking Fox',
  'Ancient Treant', 'Void Wraith', 'Sentient Storm Cloud', 'Micro-Dragon',
  'Cosmic Moth', 'Crystalline Entity', 'Talking Raven', 'Fungal Philosopher',
];

export default function CharacterCreator({ worldId }) {
  const [input, setInput] = useState('');
  const [conversation, setConversation] = useState([]);
  const [question, setQuestion] = useState('Describe your companion. Who or what are they?');
  const [loading, setLoading] = useState(false);
  const [modelStatus, setModelStatus] = useState(null);
  const inputRef = useRef(null);
  const { setPhase } = useGameStore();
  const { setCharacter } = useWorldStore();

  const submit = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    const userMsg = { role: 'user', content: input };
    const newConvo = [...conversation, userMsg];
    setConversation(newConvo);
    setInput('');

    const res = await fetch(`${API}/characters/create-step`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userInput: input, conversationSoFar: newConvo }),
    });
    const data = await res.json();

    if (data.status === 'gathering') {
      setConversation([...newConvo, { role: 'assistant', content: data.question }]);
      setQuestion(data.question);
    } else if (data.status === 'complete') {
      // Save character to DB
      const charRes = await fetch(`${API}/characters/${worldId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: data.profile }),
      });
      const character = await charRes.json();
      setCharacter(character);
      setModelStatus(character.model_status);

      if (character.model_status === 'processing') {
        // Poll model via WS — handled in App
        useGameStore.getState().setModelStatus('processing');
      }
      setPhase('playing');
    }
    setLoading(false);
    inputRef.current?.focus();
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        <div style={styles.title}>FORGE YOUR COMPANION</div>
        <div style={styles.subtitle}>Speak them into existence</div>

        <div style={styles.chatArea}>
          {conversation.slice(-6).map((msg, i) => (
            <div key={i} style={msg.role === 'user' ? styles.userMsg : styles.aiMsg}>
              {msg.content}
            </div>
          ))}
          {loading && <div style={styles.aiMsg}><span style={styles.dots}>▪ ▪ ▪</span></div>}
        </div>

        <div style={styles.questionBox}>{question}</div>

        <div style={styles.suggestions}>
          {RACE_SUGGESTIONS.slice(0, 6).map(r => (
            <button key={r} style={styles.pill} onClick={() => setInput(prev => prev ? `${prev}, ${r}` : r)}>
              {r}
            </button>
          ))}
        </div>

        <div style={styles.inputRow}>
          <input
            ref={inputRef}
            style={styles.input}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="Describe..."
            autoFocus
          />
          <button style={styles.btn} onClick={submit} disabled={loading}>
            {loading ? '...' : '→'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at center, #0a0518 0%, #000 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    fontFamily: "'Crimson Pro', serif",
  },
  container: {
    width: '92vw', maxWidth: 460, padding: '2rem 1.5rem',
    background: 'rgba(10,5,30,0.95)', border: '1px solid rgba(160,80,255,0.3)',
    borderRadius: 12, boxShadow: '0 0 80px rgba(100,20,200,0.4)',
    backdropFilter: 'blur(20px)',
  },
  title: {
    fontFamily: "'Cinzel Decorative', serif", fontSize: 18, letterSpacing: 4,
    color: '#cc88ff', textAlign: 'center', marginBottom: 4,
  },
  subtitle: { color: 'rgba(200,160,255,0.6)', fontSize: 13, textAlign: 'center', marginBottom: 20, letterSpacing: 2 },
  chatArea: { minHeight: 120, maxHeight: 200, overflowY: 'auto', marginBottom: 14 },
  userMsg: {
    textAlign: 'right', color: '#e0c8ff', fontSize: 15,
    padding: '6px 10px', marginBottom: 8, background: 'rgba(120,40,255,0.15)', borderRadius: 8,
  },
  aiMsg: {
    color: 'rgba(200,180,255,0.8)', fontSize: 15, fontStyle: 'italic',
    padding: '6px 0', marginBottom: 8, borderLeft: '2px solid rgba(160,80,255,0.4)', paddingLeft: 10,
  },
  dots: { animation: 'pulse 1s infinite', opacity: 0.7 },
  questionBox: {
    color: '#cc88ff', fontSize: 16, fontStyle: 'italic',
    padding: '10px 14px', background: 'rgba(100,20,200,0.12)',
    border: '1px solid rgba(160,80,255,0.2)', borderRadius: 8, marginBottom: 14,
  },
  suggestions: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  pill: {
    background: 'rgba(120,40,200,0.2)', border: '1px solid rgba(160,80,255,0.3)',
    color: 'rgba(200,160,255,0.8)', borderRadius: 20, padding: '4px 12px',
    fontSize: 12, cursor: 'pointer', transition: 'all 0.2s',
  },
  inputRow: { display: 'flex', gap: 8 },
  input: {
    flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(160,80,255,0.3)',
    borderRadius: 8, padding: '10px 14px', color: '#e0c8ff', fontSize: 15,
    outline: 'none', fontFamily: "'Crimson Pro', serif",
  },
  btn: {
    background: 'rgba(120,40,200,0.6)', border: '1px solid rgba(160,80,255,0.5)',
    color: '#fff', borderRadius: 8, padding: '10px 18px', fontSize: 18,
    cursor: 'pointer', transition: 'all 0.2s',
  },
};
