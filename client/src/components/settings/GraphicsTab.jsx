// client/src/components/settings/GraphicsTab.jsx
import React, { useEffect, useState } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { USER_TIER_CHOICES, TIER_PRESETS, resolveTier } from '../../engine/tier/tierConfig';
import { detectCapability, getCachedCapability } from '../../engine/tier/capability';
import { MESH_SOURCES } from '../../services/meshSource';

const CAMERA_MODES = [
  { key: 'auto',  label: 'Hybrid (auto)', icon: '🎬', desc: 'First-person while exploring · Over-shoulder during conversation' },
  { key: 'first', label: 'First-Person',  icon: '👁',  desc: 'Always your eyes' },
  { key: 'over',  label: 'Over-Shoulder', icon: '🎥', desc: 'Companion always in frame' },
  { key: 'orbit', label: 'Free Orbit',    icon: '🔄', desc: 'Pinch/drag to spin around companion' }
];

const SKIN_TONE_PRESETS = [
  { key: 'porcelain', label: 'Porcelain', color: '#fae0d2' },
  { key: 'fair',      label: 'Fair',      color: '#f6d4b6' },
  { key: 'light',     label: 'Light',     color: '#e8b894' },
  { key: 'tan',       label: 'Tan',       color: '#c89272' },
  { key: 'olive',     label: 'Olive',     color: '#a87852' },
  { key: 'brown',     label: 'Brown',     color: '#7a4830' },
  { key: 'deep',      label: 'Deep',      color: '#523018' }
];

const css = {
  section: { background: 'rgba(204,136,255,0.06)', border: '1px solid rgba(204,136,255,0.2)', borderRadius: 14, padding: 14, marginBottom: 14 },
  h: { fontSize: 13, fontWeight: 700, color: '#cc88ff', letterSpacing: 0.5, marginBottom: 6 },
  desc: { fontSize: 11, opacity: 0.7, marginBottom: 10 },
  tile: (active) => ({ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 10, background: active ? 'rgba(204,136,255,0.18)' : 'rgba(0,0,0,0.3)', border: `1px solid ${active ? '#cc88ff' : 'rgba(204,136,255,0.15)'}`, marginBottom: 6, cursor: 'pointer' }),
  tileLabel: { fontSize: 12, fontWeight: 700, marginBottom: 2 },
  tileDesc:  { fontSize: 10, opacity: 0.7 },
  badge: { display: 'inline-block', marginLeft: 6, padding: '2px 6px', borderRadius: 6, background: 'rgba(136,221,255,0.2)', color: '#88ddff', fontSize: 9, fontWeight: 800 },
  capBox: { padding: 10, borderRadius: 10, background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(204,136,255,0.2)', fontSize: 10, color: 'rgba(240,232,255,0.85)', fontFamily: 'monospace', lineHeight: 1.6 },
  toggleRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 10, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(204,136,255,0.15)', marginBottom: 6 },
  toggleLabel: { fontSize: 12, fontWeight: 600 },
  toggleDesc:  { fontSize: 10, opacity: 0.6, marginTop: 2 },
  toneSwatch:  (active, color) => ({ width: 36, height: 36, borderRadius: '50%', background: color, border: `2px solid ${active ? '#cc88ff' : 'transparent'}`, boxShadow: active ? `0 0 8px ${color}` : 'none', cursor: 'pointer', margin: 4 }),
  detectBtn: { marginTop: 8, padding: '8px 12px', width: '100%', borderRadius: 8, background: 'rgba(136,221,255,0.15)', color: '#88ddff', border: '1px solid rgba(136,221,255,0.4)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }
};

function ThreeStateOverride({ label, desc, value, onChange }) {
  // null = inherit, true = force on, false = force off
  return (
    <div style={css.toggleRow}>
      <div style={{ flex: 1, paddingRight: 12 }}>
        <div style={css.toggleLabel}>{label}</div>
        <div style={css.toggleDesc}>{desc}</div>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {[
          { v: null,  l: 'Auto' },
          { v: true,  l: 'On' },
          { v: false, l: 'Off' }
        ].map(opt => (
          <button key={String(opt.v)} onClick={() => onChange(opt.v)}
            style={{
              padding: '4px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700,
              background: value === opt.v ? 'linear-gradient(135deg,#cc88ff 0%,#7a3acc 100%)' : 'rgba(204,136,255,0.12)',
              color: value === opt.v ? '#0a0218' : '#f0e8ff'
            }}>{opt.l}</button>
        ))}
      </div>
    </div>
  );
}

export default function GraphicsTab() {
  const g = useSettingsStore(s => s.graphics);
  const setG = useSettingsStore(s => s.setGraphics);
  const setOverride = useSettingsStore(s => s.setGraphicsOverride);
  const [cap, setCap] = useState(getCachedCapability());
  const [detecting, setDetecting] = useState(false);

  const runDetect = async () => {
    setDetecting(true);
    try {
      const c = await detectCapability();
      setCap(c);
      setG({ autoDetectedTier: c.tier });
    } finally { setDetecting(false); }
  };
  useEffect(() => { if (!cap) runDetect(); }, []);

  const resolved = resolveTier(g.tierChoice, g.autoDetectedTier || 'performance_high');

  return (
    <div>
      {/* DEVICE CAPABILITY */}
      <div style={css.section}>
        <div style={css.h}>DEVICE CAPABILITY</div>
        <div style={css.desc}>What your device can handle. Auto-detected at first launch.</div>
        {cap ? (
          <div style={css.capBox}>
            <div>WebGPU: {cap.supportsWebGPU ? '✓ supported' : '✗ no'}</div>
            <div>Form: {cap.mobile ? 'mobile' : 'desktop'} · DPR {cap.dpr.toFixed(1)}</div>
            <div>RAM: {cap.mem}GB · Cores: {cap.cores}</div>
            <div>Fill-rate: {cap.benchFps} fps · Score: {cap.score}/100</div>
            <div style={{ marginTop: 4, color: '#cc88ff', fontWeight: 700 }}>
              Recommended: {TIER_PRESETS[cap.tier]?.label}
            </div>
          </div>
        ) : <div style={css.capBox}>(running benchmark…)</div>}
        <button style={css.detectBtn} onClick={runDetect} disabled={detecting}>
          {detecting ? 'Detecting…' : '🔍 Re-run benchmark'}
        </button>
      </div>

      {/* REALISM — HDRI lighting + PBR richness */}
      <div style={css.section}>
        <div style={css.h}>REALISM</div>
        <div style={css.desc}>Higher = real HDRI lighting + photoreal materials (heavier on mobile). Lower = lighter & smoother.</div>
        {[
          { key: 'high', icon: '✦', label: 'High — photoreal HDRI + PBR', desc: 'Best visuals. May lag on older phones.' },
          { key: 'med',  icon: '◐', label: 'Medium — balanced',           desc: 'Real lighting, lighter textures.' },
          { key: 'low',  icon: '○', label: 'Low — fast & smooth',         desc: 'Flat lighting, runs anywhere.' },
        ].map(c => (
          <div key={c.key} style={css.tile(g.realismQuality === c.key)} onClick={() => setG({ realismQuality: c.key })}>
            <input type="radio" checked={g.realismQuality === c.key} onChange={() => {}} style={{ accentColor: '#cc88ff', marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <div style={css.tileLabel}>{c.icon} {c.label}</div>
              <div style={css.tileDesc}>{c.desc}</div>
            </div>
          </div>
        ))}
        <div style={{ ...css.desc, marginTop: 6 }}>Changing this takes effect next time you enter a world.</div>
      </div>

      {/* QUALITY TIER — merged into REALISM above; hidden to avoid confusion.
          realismQuality high/med/low now maps to the engine tier automatically. */}
      {false && (
      <div style={css.section}>
        <div style={css.h}>QUALITY TIER</div>
        <div style={css.desc}>Adaptive picks the right tier for your device. Override for full control.</div>
        {USER_TIER_CHOICES.map(c => (
          <div key={c.key} style={css.tile(g.tierChoice === c.key)} onClick={() => setG({ tierChoice: c.key })}>
            <input type="radio" checked={g.tierChoice === c.key} onChange={() => {}} style={{ accentColor: '#cc88ff', marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <div style={css.tileLabel}>
                {c.icon} {c.label}
                {c.key === 'adaptive' && cap && <span style={css.badge}>{TIER_PRESETS[cap.tier]?.label}</span>}
              </div>
              <div style={css.tileDesc}>{c.desc}</div>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* CAMERA MODE */}
      <div style={css.section}>
        <div style={css.h}>CAMERA</div>
        <div style={css.desc}>How the world frames you and your companion.</div>
        {CAMERA_MODES.map(m => (
          <div key={m.key} style={css.tile(g.cameraMode === m.key)} onClick={() => setG({ cameraMode: m.key })}>
            <input type="radio" checked={g.cameraMode === m.key} onChange={() => {}} style={{ accentColor: '#cc88ff', marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <div style={css.tileLabel}>{m.icon} {m.label}</div>
              <div style={css.tileDesc}>{m.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* MESH SOURCE */}
      <div style={css.section}>
        <div style={css.h}>COMPANION MESH</div>
        <div style={css.desc}>How your companion gets a 3D body. RPM coming in a future update.</div>
        {Object.values(MESH_SOURCES).map(s => (
          <div key={s.id} style={css.tile(g.meshSource === s.id)} onClick={() => s.available && setG({ meshSource: s.id })}>
            <input type="radio" checked={g.meshSource === s.id} disabled={!s.available} onChange={() => {}} style={{ accentColor: '#cc88ff', marginTop: 2, opacity: s.available ? 1 : 0.4 }} />
            <div style={{ flex: 1, opacity: s.available ? 1 : 0.5 }}>
              <div style={css.tileLabel}>{s.label} {!s.available && <span style={{ fontSize: 9, color: '#ffcc66', marginLeft: 6 }}>SOON</span>}</div>
              <div style={css.tileDesc}>{s.description}</div>
            </div>
          </div>
        ))}
      </div>

      {/* SKIN TONE */}
      <div style={css.section}>
        <div style={css.h}>SKIN TONE</div>
        <div style={css.desc}>Used when the SSS skin shader is active.</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-around' }}>
          {SKIN_TONE_PRESETS.map(t => (
            <div key={t.key} title={t.label} style={css.toneSwatch(g.skinTone === t.key, t.color)} onClick={() => setG({ skinTone: t.key })} />
          ))}
        </div>
      </div>

      {/* PER-FEATURE OVERRIDES */}
      <div style={css.section}>
        <div style={css.h}>FEATURE OVERRIDES</div>
        <div style={css.desc}>Force individual effects on/off regardless of tier.</div>
        <ThreeStateOverride label="Subsurface skin"  desc="Light-through-flesh. Closer to photoreal." value={g.overrides.sssEnabled}       onChange={(v) => setOverride('sssEnabled', v)} />
        <ThreeStateOverride label="Volumetric clouds" desc="Animated cloud layer in sky."             value={g.overrides.volumetricClouds} onChange={(v) => setOverride('volumetricClouds', v)} />
        <ThreeStateOverride label="Bokeh depth-of-field" desc="Cinematic background blur."           value={g.overrides.bokehDof}         onChange={(v) => setOverride('bokehDof', v)} />
        <ThreeStateOverride label="Eye adaptation"    desc="Auto-exposure when looking at bright/dark." value={g.overrides.eyeAdaptation} onChange={(v) => setOverride('eyeAdaptation', v)} />
        <ThreeStateOverride label="Vegetation wind"   desc="Trees & grass animate. Free perf bump if off." value={g.overrides.vegetationWind} onChange={(v) => setOverride('vegetationWind', v)} />
      </div>

      {/* RESOLVED TIER PREVIEW */}
      <div style={css.section}>
        <div style={css.h}>ACTIVE CONFIG</div>
        <div style={css.capBox}>
          <div style={{ color: '#cc88ff', fontWeight: 700 }}>{resolved.label}</div>
          <div>Target {resolved.targetFps}fps · Render {(resolved.renderScale * 100).toFixed(0)}% · {resolved.textureRes}px tex</div>
          <div>Shadows {resolved.shadowsEnabled ? '✓' : '✗'} · MSAA ×{resolved.msaaSamples}</div>
          <div>Sky: {resolved.skyType} · HDRI {resolved.hdriEnabled ? '✓' : '✗'}</div>
          <div>SSS {resolved.sssEnabled ? '✓' : '✗'} · Bokeh {resolved.bokehDof ? '✓' : '✗'} · Vol Clouds {resolved.volumetricClouds ? '✓' : '✗'}</div>
        </div>
      </div>
    </div>
  );
}
