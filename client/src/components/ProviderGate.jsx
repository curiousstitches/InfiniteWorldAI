// client/src/components/ProviderGate.jsx
// First-run gate. Screen 1: cost warning (Continue lights up after "I Agree").
// Screen 2: provider chooser — Free + Paid dropdowns, bring-your-own-key suggested,
// Continue disabled until a valid choice is made. Saves to providerGate storage.

import { useState } from 'react';
import { saveChoice } from '../services/providerGate.js';

// Provider options for the two dropdowns. keyUrl = where to get a free/paid key.
const FREE_PROVIDERS = [
  { id: 'byok:groq',       label: 'Groq — free, no card (recommended)', provider: 'groq',       keyUrl: 'https://console.groq.com/keys', byok: true },
  { id: 'byok:google',     label: 'Google Gemini — free tier',          provider: 'google',     keyUrl: 'https://aistudio.google.com/apikey', byok: true },
  { id: 'byok:openrouter', label: 'OpenRouter — free models',           provider: 'openrouter', keyUrl: 'https://openrouter.ai/keys', byok: true },
  { id: 'byok:cerebras',   label: 'Cerebras — free tier',               provider: 'cerebras',   keyUrl: 'https://cloud.cerebras.ai', byok: true },
  { id: 'server:groq',     label: 'Quick try — shared free server (limited daily)', provider: null, byok: false, transport: 'server' },
];

const PAID_PROVIDERS = [
  { id: 'puter:default',   label: 'Puter — $0.25 free, then plans ~$10/mo', provider: 'puter', byok: false, transport: 'puter' },
  { id: 'byok:openai',     label: 'OpenAI — your key (pay-as-you-go)',  provider: 'openai',     keyUrl: 'https://platform.openai.com/api-keys', byok: true },
  { id: 'byok:anthropic',  label: 'Anthropic Claude — your key',        provider: 'anthropic',  keyUrl: 'https://console.anthropic.com/settings/keys', byok: true },
];

export default function ProviderGate({ onComplete }) {
  const [screen, setScreen] = useState(1);
  const [agreed, setAgreed] = useState(false);
  const [dontRemind, setDontRemind] = useState(false);

  const [freeChoice, setFreeChoice] = useState('');
  const [paidChoice, setPaidChoice] = useState('');
  const [ownKey, setOwnKey] = useState('');

  // The active selection is whichever dropdown the player last picked.
  const [activeList, setActiveList] = useState(null); // 'free' | 'paid'
  const selectedId = activeList === 'free' ? freeChoice : activeList === 'paid' ? paidChoice : '';
  const selected = [...FREE_PROVIDERS, ...PAID_PROVIDERS].find(p => p.id === selectedId);

  const needsKey = selected?.byok;
  const canContinue = selected && (!needsKey || ownKey.trim().length > 8);

  const finish = () => {
    saveChoice({
      providerId: selected.id,
      transport: selected.transport || (selected.byok ? 'byok' : 'puter'),
      ownKey: needsKey ? ownKey.trim() : '',
      ownKeyProvider: needsKey ? selected.provider : null,
      dontRemind,
    });
    onComplete();
  };

  // ── SCREEN 1 — WARNING ──
  if (screen === 1) {
    return (
      <div style={S.overlay}>
        <div style={S.card}>
          <div style={S.title}>Before you begin</div>
          <div style={S.body}>
            <p style={S.p}>
              InfiniteWorldAI is powered by AI services that are <b>not 100% free</b> — but costs are
              low and <b>you stay in control</b>.
            </p>
            <div style={S.box}>
              <div style={S.boxRow}><b>Bring your own key</b> — Groq, Gemini, OpenRouter & Cerebras all
                offer <b>free</b> tiers (no credit card). This is the cheapest path and what we recommend.</div>
              <div style={S.boxRow}><b>Puter</b> — gives a one-time <b>$0.25</b> free credit, then requires
                a plan starting around <b>$10/month</b>.</div>
              <div style={S.boxRow}><b>Paid keys</b> — OpenAI / Anthropic work too, billed by them at
                pay-as-you-go rates.</div>
            </div>
            <p style={S.pSmall}>
              Your key is stored only in <b>your browser</b> — never sent to our servers. You can change
              your provider anytime in Settings.
            </p>
          </div>

          <label style={S.agreeRow}>
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={S.cb} />
            <span>I understand the costs and how each option works.</span>
          </label>

          <label style={S.remindRow}>
            <input type="checkbox" checked={dontRemind} onChange={e => setDontRemind(e.target.checked)} style={S.cb} />
            <span>Don't remind me next time.</span>
          </label>
          {dontRemind && (
            <div style={S.remindNote}>You'll still see this reminder every 15th visit, for safety.</div>
          )}

          <button
            style={{ ...S.continueBtn, ...(agreed ? {} : S.continueDisabled) }}
            disabled={!agreed}
            onClick={() => setScreen(2)}
          >Continue →</button>
        </div>
      </div>
    );
  }

  // ── SCREEN 2 — PROVIDER CHOOSER ──
  return (
    <div style={S.overlay}>
      <div style={S.card}>
        <div style={S.title}>Choose your AI provider</div>
        <div style={S.suggestion}>💡 We suggest <b>bringing your own free key</b> (Groq is easiest).</div>

        <div style={S.label}>✦ Free providers</div>
        <select
          style={S.select}
          value={activeList === 'free' ? freeChoice : ''}
          onChange={e => { setFreeChoice(e.target.value); setPaidChoice(''); setActiveList('free'); setOwnKey(''); }}
        >
          <option value="">— select a free option —</option>
          {FREE_PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>

        <div style={S.label}>✦ Paid providers</div>
        <select
          style={S.select}
          value={activeList === 'paid' ? paidChoice : ''}
          onChange={e => { setPaidChoice(e.target.value); setFreeChoice(''); setActiveList('paid'); setOwnKey(''); }}
        >
          <option value="">— select a paid option —</option>
          {PAID_PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>

        {needsKey && (
          <div style={S.keyArea}>
            <div style={S.keyHint}>
              Get a key here: <a style={S.link} href={selected.keyUrl} target="_blank" rel="noreferrer">{selected.keyUrl}</a>
            </div>
            <input
              style={S.keyInput}
              type="password"
              placeholder={`Paste your ${selected.provider} API key`}
              value={ownKey}
              onChange={e => setOwnKey(e.target.value)}
            />
            <div style={S.keyNote}>Stored only in your browser. Bypasses the shared daily limit.</div>
          </div>
        )}

        {selected?.transport === 'server' && (
          <div style={S.keyNote}>Uses a shared free key — limited to 100 messages/day across all players.</div>
        )}
        {selected?.transport === 'puter' && (
          <div style={S.keyNote}>Puter runs in your browser. After the $0.25 credit, a plan is required.</div>
        )}

        <div style={S.btnRow}>
          <button style={S.backBtn} onClick={() => setScreen(1)}>‹ Back</button>
          <button
            style={{ ...S.continueBtn, flex: 1, ...(canContinue ? {} : S.continueDisabled) }}
            disabled={!canContinue}
            onClick={finish}
          >Enter the world →</button>
        </div>
      </div>
    </div>
  );
}

const S = {
  overlay: { position: 'fixed', inset: 0, zIndex: 500, background: 'radial-gradient(ellipse at center,#0e0626 0%,#000 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14, overflowY: 'auto',
    fontFamily: 'system-ui, sans-serif' },
  card: { width: '100%', maxWidth: 440, maxHeight: '92vh', overflowY: 'auto',
    background: 'linear-gradient(160deg,#1a0a38 0%,#0a0418 100%)',
    border: '1px solid rgba(204,136,255,0.35)', borderRadius: 18, padding: 24,
    paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 16px))',
    boxShadow: '0 0 70px rgba(120,40,200,0.4)' },
  title: { color: '#fff', fontSize: 22, fontWeight: 800, marginBottom: 12, textAlign: 'center' },
  body: { marginBottom: 8 },
  p: { color: 'rgba(224,208,255,0.92)', fontSize: 14.5, lineHeight: 1.6, margin: '0 0 12px' },
  pSmall: { color: 'rgba(200,170,255,0.7)', fontSize: 12.5, lineHeight: 1.55, margin: '10px 0 0' },
  box: { background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(204,136,255,0.2)', borderRadius: 12, padding: 14 },
  boxRow: { color: 'rgba(224,208,255,0.9)', fontSize: 13.5, lineHeight: 1.6, marginBottom: 10 },
  suggestion: { color: '#88ddff', fontSize: 13.5, textAlign: 'center', marginBottom: 16,
    background: 'rgba(136,221,255,0.1)', border: '1px solid rgba(136,221,255,0.25)', borderRadius: 10, padding: '8px 12px' },
  label: { color: '#cc88ff', fontSize: 13, fontWeight: 700, margin: '14px 0 6px', letterSpacing: 1 },
  select: { width: '100%', padding: '12px', borderRadius: 10, fontSize: 14,
    background: 'rgba(255,255,255,0.06)', color: '#e8d8ff', border: '1px solid rgba(160,80,255,0.35)' },
  keyArea: { marginTop: 14, background: 'rgba(0,0,0,0.25)', borderRadius: 12, padding: 12, border: '1px solid rgba(204,136,255,0.2)' },
  keyHint: { color: 'rgba(200,170,255,0.8)', fontSize: 12, marginBottom: 8, wordBreak: 'break-all' },
  keyInput: { width: '100%', padding: '11px', borderRadius: 8, fontSize: 14, boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.07)', color: '#e8d8ff', border: '1px solid rgba(160,80,255,0.4)' },
  keyNote: { color: 'rgba(200,170,255,0.6)', fontSize: 11.5, marginTop: 8, lineHeight: 1.5 },
  link: { color: '#88ddff', textDecoration: 'none' },
  agreeRow: { display: 'flex', gap: 10, alignItems: 'flex-start', color: 'rgba(224,208,255,0.95)',
    fontSize: 13.5, lineHeight: 1.5, margin: '16px 0 10px', cursor: 'pointer' },
  remindRow: { display: 'flex', gap: 10, alignItems: 'center', color: 'rgba(200,170,255,0.8)',
    fontSize: 13, margin: '0 0 4px', cursor: 'pointer' },
  remindNote: { color: 'rgba(255,204,102,0.8)', fontSize: 11.5, margin: '2px 0 8px 28px' },
  cb: { width: 18, height: 18, accentColor: '#cc88ff', marginTop: 1, flexShrink: 0 },
  continueBtn: { width: '100%', marginTop: 14, background: 'linear-gradient(135deg,#cc88ff 0%,#7a3acc 100%)',
    border: 'none', color: '#0a0218', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 800, cursor: 'pointer' },
  continueDisabled: { background: 'rgba(120,90,160,0.3)', color: 'rgba(255,255,255,0.4)', cursor: 'not-allowed' },
  btnRow: { display: 'flex', gap: 10, alignItems: 'center', marginTop: 16 },
  backBtn: { background: 'transparent', border: '1px solid rgba(204,136,255,0.3)', color: '#cc88ff',
    borderRadius: 12, padding: '14px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
};
