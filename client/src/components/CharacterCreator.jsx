import { useState, useRef, useEffect } from 'react';
import { useGameStore, useWorldStore } from '../store/worldStore.js';
import { runCreateStep } from '../services/characterCreatorBrain.js';
import AvatarCreatorModal from './AvatarCreatorModal.jsx';

const API = '/api';

// Per-question suggestion sets. Index aligns with userTurns count.
// 0 = race/species (first), 1 = appearance, 2 = personality, 3 = voice/speech style
const SUGGESTION_SETS = [
  // 0: race / species
  [
    'Human', 'Elf', 'Dwarf', 'Werewolf', 'Dragon (small)', 'Talking Fox',
    'Ancient Treant', 'Cosmic Moth', 'Crystalline Entity', 'Talking Raven',
  ],
  // 1: striking appearance feature
  [
    'Glowing eyes', 'Silver hair', 'Antlers', 'Scarred face', 'Iridescent skin',
    'Crystal embedded', 'Tattooed glyphs', 'Tall and lean', 'Round and soft',
  ],
  // 2: personality / what pulls them to you
  [
    'Curious', 'Loyal', 'Mischievous', 'Protective', 'Lonely',
    'Wise', 'Reckless', 'Gentle', 'Sharp-tongued', 'Hopeful',
  ],
  // 3: speech style — three words
  [
    'Soft and lyrical', 'Sharp and dry', 'Slow and weighty', 'Quick and breathy',
    'Warm and honeyed', 'Rough and graveled', 'Formal and ancient',
  ],
];

const FIRST_QUESTION = 'Describe your companion. Who or what are they?';

export default function CharacterCreator({ worldId }) {
  const [input, setInput] = useState('');
  const [conversation, setConversation] = useState([]);
  const [question, setQuestion] = useState(FIRST_QUESTION);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAvatar, setShowAvatar] = useState(false);
  const pendingProfileRef = useRef(null);
  const inputRef = useRef(null);
  const { setPhase, setCharacterModelUrl, setModelStatus } = useGameStore();
  const { setCharacter, reset } = useWorldStore();

  // Which step are we on (matches how many user turns have happened)?
  const userTurns = conversation.filter(m => m.role === 'user').length;
  const currentSuggestions = SUGGESTION_SETS[Math.min(userTurns, SUGGESTION_SETS.length - 1)];

  // Back button → wipe everything, return to home.
  const handleBack = () => {
    reset();
    setPhase('home');
  };

  // Save profile (+ optional RPM avatar URL) and enter the world.
  const finalizeCharacter = async (avatarUrl) => {
    const profile = pendingProfileRef.current || {};
    let character = null;
    try {
      const charRes = await fetch(`${API}/characters/${worldId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: { ...profile, avatarUrl } }),
      });
      if (charRes.ok) character = await charRes.json();
    } catch (e) {
      console.warn('[character save failed — using inline]', e);
    }
    if (!character) {
      character = { id: `local-${Date.now()}`, world_id: worldId, ...profile,
        model_url: avatarUrl || null, model_status: 'ready' };
    }
    // Ensure the avatar URL lands on model_url even if server ignored it.
    if (avatarUrl && !character.model_url) character.model_url = avatarUrl;

    setCharacter(character);
    setCharacterModelUrl(character.model_url || null);
    setModelStatus('ready');
    setShowAvatar(false);
    setPhase('playing');
  };

  const submit = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setError(null);
    const userMsg = { role: 'user', content: input };
    const newConvo = [...conversation, userMsg];
    setConversation(newConvo);
    const sentInput = input;
    setInput('');

    try {
      // Tries Puter (browser-side, free) → server → scripted fallback. Always returns something.
      const data = await runCreateStep(sentInput, newConvo);

      if (data.status === 'gathering') {
        setConversation([...newConvo, { role: 'assistant', content: data.question }]);
        setQuestion(data.question);
      } else if (data.status === 'complete') {
        // Text interview done → stash profile, let the user build their avatar body.
        pendingProfileRef.current = data.profile;
        setShowAvatar(true);
      } else {
        throw new Error('unexpected response');
      }
    } catch (err) {
      console.error('[create-step failed]', err);
      setError('Lost connection. Tap to retry.');
      // Roll back the user message so they can re-submit
      setConversation(conversation);
      setInput(sentInput);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const addSuggestion = (s) => {
    setInput(prev => prev ? `${prev}, ${s}` : s);
    inputRef.current?.focus();
  };

  return (
    <div style={styles.overlay}>
      {showAvatar && (
        <AvatarCreatorModal
          onExported={(url) => finalizeCharacter(url)}
          onSkip={() => finalizeCharacter(null)}
        />
      )}
      <div style={styles.container}>
        {/* Back button — top-left */}
        <button style={styles.backBtn} onClick={handleBack} aria-label="Back">‹  Back</button>

        <div style={styles.title}>FORGE YOUR COMPANION</div>
        <div style={styles.subtitle}>Speak them into existence</div>

        {/* Step indicator */}
        <div style={styles.steps}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{ ...styles.stepDot, ...(i <= userTurns ? styles.stepDotActive : {}) }} />
          ))}
        </div>

        <div style={styles.chatArea}>
          {conversation.slice(-6).map((msg, i) => (
            <div key={i} style={msg.role === 'user' ? styles.userMsg : styles.aiMsg}>
              {msg.content}
            </div>
          ))}
          {loading && <div style={styles.aiMsg}><span style={styles.dots}>▪ ▪ ▪</span></div>}
        </div>

        <div style={styles.questionBox}>{question}</div>

        {/* Suggestions — change per step */}
        <div style={styles.suggestions}>
          {currentSuggestions.slice(0, 8).map(s => (
            <button key={s} style={styles.pill} onClick={() => addSuggestion(s)}>
              {s}
            </button>
          ))}
        </div>

        {error && <div style={styles.error}>{error}</div>}

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
          <button style={styles.btn} onClick={submit} disabled={loading || !input.trim()}>
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
    overflowY: 'auto', padding: '12px 0',
  },
  container: {
    position: 'relative',
    width: '92vw', maxWidth: 460, padding: '1.5rem 1.25rem',
    margin: 'auto',
    maxHeight: '88vh', overflowY: 'auto',
    // Extra bottom padding clears the mobile keyboard + browser chrome so the
    // input row and send button are never cut off.
    paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 24px))',
    background: 'rgba(10,5,30,0.95)', border: '1px solid rgba(160,80,255,0.3)',
    borderRadius: 12, boxShadow: '0 0 80px rgba(100,20,200,0.4)',
    backdropFilter: 'blur(20px)',
  },
  backBtn: {
    position: 'absolute', top: 14, left: 14,
    background: 'transparent', border: 'none', color: 'rgba(204,136,255,0.8)',
    fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '4px 8px',
    fontFamily: "'Crimson Pro', serif", letterSpacing: 0.5,
  },
  title: {
    fontFamily: "'Cinzel Decorative', serif", fontSize: 18, letterSpacing: 4,
    color: '#cc88ff', textAlign: 'center', marginBottom: 4, marginTop: 8,
  },
  subtitle: { color: 'rgba(200,160,255,0.6)', fontSize: 13, textAlign: 'center', marginBottom: 14, letterSpacing: 2 },
  steps: {
    display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 16,
  },
  stepDot: {
    width: 30, height: 4, borderRadius: 2,
    background: 'rgba(160,80,255,0.2)',
    transition: 'background 0.3s',
  },
  stepDotActive: { background: '#cc88ff', boxShadow: '0 0 6px rgba(204,136,255,0.6)' },
  chatArea: { minHeight: 80, maxHeight: 200, overflowY: 'auto', marginBottom: 14 },
  userMsg: {
    textAlign: 'right', color: '#f0e0ff', fontSize: 17,
    padding: '9px 13px', marginBottom: 9, background: 'linear-gradient(135deg,rgba(120,40,255,0.25),rgba(200,60,160,0.2))', borderRadius: 10,
  },
  aiMsg: {
    color: 'rgba(220,200,255,0.95)', fontSize: 17, fontStyle: 'italic', lineHeight: 1.5,
    padding: '7px 0', marginBottom: 9, borderLeft: '3px solid rgba(204,136,255,0.6)', paddingLeft: 12,
  },
  dots: { opacity: 0.7 },
  questionBox: {
    color: '#e8d0ff', fontSize: 18, fontStyle: 'italic', lineHeight: 1.5,
    padding: '14px 16px', background: 'linear-gradient(135deg,rgba(120,30,200,0.2),rgba(200,40,140,0.12))',
    border: '1px solid rgba(204,136,255,0.35)', borderRadius: 12, marginBottom: 16,
  },
  suggestions: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  pill: {
    background: 'linear-gradient(135deg,rgba(120,40,200,0.3),rgba(200,60,160,0.2))', border: '1px solid rgba(204,136,255,0.45)',
    color: '#f0e0ff', borderRadius: 20, padding: '8px 15px',
    fontSize: 14, cursor: 'pointer', transition: 'all 0.2s',
    fontFamily: "'Crimson Pro', serif",
  },
  error: {
    color: '#ff9999', fontSize: 14, padding: '9px 13px', marginBottom: 10,
    background: 'rgba(255,40,40,0.12)', borderRadius: 8, border: '1px solid rgba(255,80,80,0.35)',
    textAlign: 'center',
  },
  inputRow: { display: 'flex', gap: 8 },
  input: {
    flex: 1, background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(204,136,255,0.45)',
    borderRadius: 10, padding: '13px 16px', color: '#f0e0ff', fontSize: 17,
    outline: 'none', fontFamily: "'Crimson Pro', serif",
  },
  btn: {
    background: 'linear-gradient(135deg,#7a3acc,#cc3a8a)', border: 'none',
    color: '#fff', borderRadius: 10, padding: '13px 20px', fontSize: 20,
    cursor: 'pointer', transition: 'all 0.2s', fontWeight: 700,
  },
};
