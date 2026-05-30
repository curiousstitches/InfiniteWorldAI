// client/src/components/settings/PersonalityTab.jsx
import React from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { OCEAN, SUB_TRAITS, ATTACHMENT_STYLES, SPEECH_REGISTERS, VOICE_PROSODY, QUIRK_POOL, SECTIONS } from '../../personality/schema';

const css = {
  section: { background: 'rgba(204,136,255,0.06)', border: '1px solid rgba(204,136,255,0.2)', borderRadius: 14, padding: 14, marginBottom: 14 },
  sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  h: { fontSize: 13, fontWeight: 700, color: '#cc88ff', letterSpacing: 0.5 },
  desc: { fontSize: 11, opacity: 0.7, marginBottom: 10 },
  modeToggle: { display: 'flex', gap: 4, padding: 4, borderRadius: 12, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(204,136,255,0.25)', marginBottom: 14 },
  modeBtn: (active) => ({ flex: 1, padding: '10px 12px', border: 'none', borderRadius: 8, background: active ? 'linear-gradient(135deg,#cc88ff 0%,#7a3acc 100%)' : 'transparent', color: active ? '#0a0218' : '#f0e8ff', fontWeight: 700, fontSize: 11, letterSpacing: 0.5, cursor: 'pointer' }),
  rand: { padding: '6px 10px', borderRadius: 8, background: 'rgba(136,221,255,0.15)', color: '#88ddff', border: '1px solid rgba(136,221,255,0.4)', fontSize: 10, fontWeight: 700, cursor: 'pointer' },
  randAll: { width: '100%', padding: '12px 14px', borderRadius: 12, background: 'linear-gradient(135deg,#cc88ff 0%,#7a3acc 100%)', color: '#0a0218', border: 'none', fontSize: 13, fontWeight: 800, cursor: 'pointer', marginBottom: 14, letterSpacing: 1 },
  resetBtn: { width: '100%', padding: '10px', borderRadius: 10, background: 'rgba(255,102,102,0.12)', color: '#ff9090', border: '1px solid rgba(255,102,102,0.4)', fontSize: 11, fontWeight: 700, cursor: 'pointer', marginTop: 12 },
  input: { width: '100%', padding: '10px 12px', borderRadius: 10, background: 'rgba(0,0,0,0.5)', color: '#f0e8ff', border: '1px solid rgba(204,136,255,0.3)', fontSize: 13, boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '10px 12px', borderRadius: 10, background: 'rgba(0,0,0,0.5)', color: '#f0e8ff', border: '1px solid rgba(204,136,255,0.3)', fontSize: 12, minHeight: 80, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' },
  select: { width: '100%', padding: '10px 12px', borderRadius: 10, background: 'rgba(0,0,0,0.5)', color: '#f0e8ff', border: '1px solid rgba(204,136,255,0.3)', fontSize: 12, boxSizing: 'border-box' },
  sliderRow: { marginBottom: 12 },
  sliderLabelRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sliderLabel: { fontSize: 11, fontWeight: 600 },
  sliderValue: { fontSize: 11, fontWeight: 700, color: '#cc88ff' },
  slider: { width: '100%', accentColor: '#cc88ff' },
  sliderDesc: { fontSize: 9, opacity: 0.55, marginTop: 2 },
  chip: (active) => ({ display: 'inline-block', padding: '6px 10px', margin: '4px 4px 4px 0', borderRadius: 999, background: active ? 'linear-gradient(135deg,#cc88ff 0%,#7a3acc 100%)' : 'rgba(204,136,255,0.08)', color: active ? '#0a0218' : '#f0e8ff', border: '1px solid rgba(204,136,255,0.3)', fontSize: 10, fontWeight: 600, cursor: 'pointer' }),
  label: { fontSize: 11, fontWeight: 600, marginBottom: 4, display: 'block' }
};

function Slider({ value, onChange, label, icon, desc }) {
  return (
    <div style={css.sliderRow}>
      <div style={css.sliderLabelRow}>
        <span style={css.sliderLabel}>{icon} {label}</span>
        <span style={css.sliderValue}>{value}</span>
      </div>
      <input type="range" min={0} max={100} value={value} onChange={(e) => onChange(parseInt(e.target.value, 10))} style={css.slider} />
      {desc && <div style={css.sliderDesc}>{desc}</div>}
    </div>
  );
}

function Section({ title, sectionKey, basic, children }) {
  const randomize = useSettingsStore(s => s.randomizePersonalitySection);
  return (
    <div style={css.section}>
      <div style={css.sectionHeader}>
        <span style={css.h}>{title}{basic && <span style={{ marginLeft: 6, fontSize: 9, opacity: 0.5 }}>BASIC</span>}</span>
        <button style={css.rand} onClick={() => randomize(sectionKey)}>🎲 Randomize</button>
      </div>
      {children}
    </div>
  );
}

export default function PersonalityTab() {
  const p = useSettingsStore(s => s.personality);
  const setField = useSettingsStore(s => s.setPersonalityField);
  const setOcean = useSettingsStore(s => s.setOceanTrait);
  const setSub   = useSettingsStore(s => s.setSubTrait);
  const randomizeAll = useSettingsStore(s => s.randomizeAllPersonality);
  const reset = useSettingsStore(s => s.resetPersonality);

  const detailed = p.mode === 'detailed';
  const toggleQuirk = (q) => setField('quirks', p.quirks.includes(q) ? p.quirks.filter(x => x !== q) : [...p.quirks, q].slice(0, 3));

  return (
    <div>
      {/* Mode toggle */}
      <div style={css.modeToggle}>
        <button style={css.modeBtn(!detailed)} onClick={() => setField('mode', 'basic')}>Basic</button>
        <button style={css.modeBtn(detailed)} onClick={() => setField('mode', 'detailed')}>Detailed</button>
      </div>

      {/* Master randomizer */}
      <button style={css.randAll} onClick={randomizeAll}>🎲 RANDOMIZE ENTIRE PERSONALITY</button>

      {/* Name + vibe — always visible in both modes */}
      <Section title="Identity" sectionKey="name" basic>
        <label style={css.label}>Name</label>
        <input style={css.input} value={p.name || ''} onChange={(e) => setField('name', e.target.value)} placeholder="Lyra" />
        <label style={{ ...css.label, marginTop: 10 }}>Vibe (free-form — describe them in your own words)</label>
        <textarea style={css.textarea} value={p.vibe || ''} onChange={(e) => setField('vibe', e.target.value)} placeholder="e.g. a sarcastic moth-girl who hums to crystals and is secretly terrified of birds" />
      </Section>

      {/* OCEAN — always shown (basic core) */}
      <Section title="Core Personality (OCEAN)" sectionKey="ocean" basic>
        {OCEAN.map(t => (
          <Slider key={t.key} icon={t.icon} label={t.label} desc={t.desc}
            value={p.ocean?.[t.key] ?? 50}
            onChange={(v) => setOcean(t.key, v)} />
        ))}
      </Section>

      {/* DETAILED MODE — everything below */}
      {detailed && (
        <>
          <Section title="Sub-Traits" sectionKey="subTraits">
            {SUB_TRAITS.map(t => (
              <Slider key={t.key} icon={t.icon} label={t.label} desc={t.desc}
                value={p.subTraits?.[t.key] ?? 50}
                onChange={(v) => setSub(t.key, v)} />
            ))}
          </Section>

          <Section title="Attachment Style" sectionKey="attachment">
            <select style={css.select} value={p.attachment} onChange={(e) => setField('attachment', e.target.value)}>
              {ATTACHMENT_STYLES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <div style={css.sliderDesc}>Drives how they react to silence, distance, and intimacy.</div>
          </Section>

          <Section title="Speech & Voice" sectionKey="speech">
            <label style={css.label}>Speech register</label>
            <select style={css.select} value={p.speechRegister} onChange={(e) => setField('speechRegister', e.target.value)}>
              {SPEECH_REGISTERS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <label style={{ ...css.label, marginTop: 10 }}>Voice prosody</label>
            <select style={css.select} value={p.voiceProsody} onChange={(e) => setField('voiceProsody', e.target.value)}>
              {VOICE_PROSODY.map(v => <option key={v.key} value={v.key}>{v.label}</option>)}
            </select>
            <div style={{ marginTop: 10 }}>
              <Slider icon="🌊" label="Mood Volatility" desc="How fast moods swing."
                value={p.moodVolatility ?? 30}
                onChange={(v) => setField('moodVolatility', v)} />
            </div>
          </Section>

          <Section title="Quirks (up to 3)" sectionKey="quirks">
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
              {QUIRK_POOL.map(q => (
                <span key={q} style={css.chip(p.quirks?.includes(q))} onClick={() => toggleQuirk(q)}>{q}</span>
              ))}
            </div>
          </Section>

          <Section title="Backstory" sectionKey="backstory">
            <textarea style={css.textarea} value={p.backstory || ''} onChange={(e) => setField('backstory', e.target.value)}
              placeholder="A few lines. Revealed organically, never as exposition dump." />
          </Section>

          <Section title="Relationship Dynamics" sectionKey="relationship">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <input type="checkbox" checked={!!p.relationshipEvolution} onChange={(e) => setField('relationshipEvolution', e.target.checked)} />
              <span style={{ fontSize: 12 }}>Evolves over time (affection & trust shift from actions)</span>
            </label>
            <Slider icon="💞" label="Starting Affection" value={p.affection ?? 50} onChange={(v) => setField('affection', v)} />
            <Slider icon="🤝" label="Starting Trust"     value={p.trust ?? 50}     onChange={(v) => setField('trust', v)} />
          </Section>
        </>
      )}

      <button style={css.resetBtn} onClick={reset}>↺ Reset to neutral baseline</button>
    </div>
  );
}
