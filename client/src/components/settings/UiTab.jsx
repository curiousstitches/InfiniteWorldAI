// client/src/components/settings/UiTab.jsx
import React from 'react';
import { useSettingsStore, PANEL_MODE } from '../../store/settingsStore';

const PANEL_MODES = [
  { key: PANEL_MODE.OFF,         label: 'Off',         desc: 'No floating panel.' },
  { key: PANEL_MODE.SOLID,       label: 'Solid',       desc: 'Always visible, full opacity.' },
  { key: PANEL_MODE.TRANSLUCENT, label: 'Translucent', desc: 'Always visible, ~30% opacity.' },
  { key: PANEL_MODE.FADE,        label: 'Fade',        desc: 'Appears on AI activity, fades after a beat.' },
  { key: PANEL_MODE.PULSE,       label: 'Pulse',       desc: 'Flashes only when the active model switches.' }
];

const css = {
  section: { background: 'rgba(204,136,255,0.06)', border: '1px solid rgba(204,136,255,0.2)', borderRadius: 14, padding: 14, marginBottom: 14 },
  h: { fontSize: 13, fontWeight: 700, color: '#cc88ff', letterSpacing: 0.5, marginBottom: 4 },
  desc: { fontSize: 11, opacity: 0.7, marginBottom: 10 },
  optRow: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(204,136,255,0.15)', marginBottom: 6, cursor: 'pointer' },
  optActive: { background: 'rgba(204,136,255,0.18)', border: '1px solid #cc88ff' },
  optLabel: { fontSize: 12, fontWeight: 700, marginBottom: 2 },
  optDesc: { fontSize: 10, opacity: 0.7 },
  toggleRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 10, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(204,136,255,0.15)', marginBottom: 8 },
  toggleLabel: { fontSize: 12, fontWeight: 600 },
  toggleDesc: { fontSize: 10, opacity: 0.6, marginTop: 2 },
  switch: (on) => ({ position: 'relative', width: 44, height: 24, borderRadius: 12, background: on ? 'linear-gradient(135deg,#cc88ff 0%,#7a3acc 100%)' : 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }),
  switchDot: (on) => ({ position: 'absolute', top: 2, left: on ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }),
  slider: { width: '100%', accentColor: '#cc88ff', marginTop: 8 },
  sliderRow: { display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }
};

function Toggle({ checked, onChange, label, desc }) {
  return (
    <div style={css.toggleRow}>
      <div style={{ flex: 1, paddingRight: 12 }}>
        <div style={css.toggleLabel}>{label}</div>
        {desc && <div style={css.toggleDesc}>{desc}</div>}
      </div>
      <button style={css.switch(!!checked)} onClick={() => onChange(!checked)} aria-pressed={!!checked}>
        <div style={css.switchDot(!!checked)} />
      </button>
    </div>
  );
}

export default function UiTab() {
  const ui = useSettingsStore(s => s.ui);
  const setUi = useSettingsStore(s => s.setUi);

  return (
    <div>
      <div style={css.section}>
        <div style={css.h}>FLOATING AI STATUS PANEL</div>
        <div style={css.desc}>How the live model name & tier badge appear during gameplay.</div>
        {PANEL_MODES.map(m => (
          <div key={m.key} style={{ ...css.optRow, ...(ui.panelMode === m.key ? css.optActive : {}) }} onClick={() => setUi({ panelMode: m.key })}>
            <input type="radio" name="pm" checked={ui.panelMode === m.key} onChange={() => setUi({ panelMode: m.key })} style={{ accentColor: '#cc88ff', marginTop: 2 }} />
            <div>
              <div style={css.optLabel}>{m.label}</div>
              <div style={css.optDesc}>{m.desc}</div>
            </div>
          </div>
        ))}
        {ui.panelMode === PANEL_MODE.FADE && (
          <div style={{ marginTop: 10 }}>
            <div style={css.sliderRow}>
              <span style={{ fontSize: 11, fontWeight: 600 }}>Fade-after</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#cc88ff' }}>{ui.fadeAfterMs}ms</span>
            </div>
            <input type="range" min={500} max={6000} step={100} value={ui.fadeAfterMs} onChange={(e) => setUi({ fadeAfterMs: parseInt(e.target.value, 10) })} style={css.slider} />
          </div>
        )}
      </div>

      <div style={css.section}>
        <div style={css.h}>IN-GAME MODEL BADGE</div>
        <div style={css.desc}>The persistent corner badge that shows which AI is talking, color-coded by tier.</div>
        <Toggle label="Show model badge during gameplay" desc="Tap to expand into full Settings." checked={ui.showModelBadgeInGame} onChange={(v) => setUi({ showModelBadgeInGame: v })} />
        {ui.showModelBadgeInGame && (
          <div style={{ marginTop: 10 }}>
            <div style={css.sliderRow}>
              <span style={{ fontSize: 11, fontWeight: 600 }}>Badge opacity</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#cc88ff' }}>{Math.round((ui.modelBadgeOpacity ?? 0.85) * 100)}%</span>
            </div>
            <input type="range" min={20} max={100} step={5} value={Math.round((ui.modelBadgeOpacity ?? 0.85) * 100)} onChange={(e) => setUi({ modelBadgeOpacity: parseInt(e.target.value, 10) / 100 })} style={css.slider} />
          </div>
        )}
      </div>

      <div style={css.section}>
        <div style={css.h}>HUD VISIBILITY</div>
        <div style={css.desc}>For a more cinematic, full-screen feel.</div>
        <Toggle label="Hide all HUD" desc="Hides badges, tasks, and the mic strip. Voice still works." checked={ui.hideAllHud} onChange={(v) => setUi({ hideAllHud: v })} />
        <Toggle label="Hide subtitles" desc="Companion voice still plays — text bubble disappears." checked={ui.hideSubtitles} onChange={(v) => setUi({ hideSubtitles: v })} />
      </div>
    </div>
  );
}
