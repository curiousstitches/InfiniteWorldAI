// client/src/components/AiStatusPanel.jsx
// Floating, tap-to-expand model status. Renders per the user's ui.panelMode setting (Q3-C).
// Color-coded per tier (Q4-C). Honors hideAllHud / hideSubtitles toggles.

import React, { useEffect, useState, useRef } from 'react';
import { useSettingsStore, PANEL_MODE } from '../store/settingsStore';
import { onProviderChange, getActive } from '../providers/router';
import { byId, tierOf, TIER } from '../providers/registry';

const AGENT_ORDER = [
  { key: 'companion', icon: '🤝', label: 'Companion' },
  { key: 'gm',        icon: '🌍', label: 'GM' },
  { key: 'taskgen',   icon: '⚡', label: 'TaskGen' },
  { key: 'stt',       icon: '🎤', label: 'STT' },
  { key: 'tts',       icon: '🔊', label: 'TTS' }
];

const css = {
  wrap: (opacity, pointerEvents) => ({
    position: 'fixed', top: 12, right: 12, zIndex: 50,
    display: 'flex', flexDirection: 'column', gap: 4,
    opacity, pointerEvents,
    transition: 'opacity 400ms ease', maxWidth: 220, fontFamily: 'system-ui, sans-serif'
  }),
  chip: (color, opacity) => ({
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '4px 8px', borderRadius: 999,
    background: `rgba(0,0,0,${0.55 * opacity})`,
    border: `1px solid ${color}`,
    boxShadow: `0 0 6px ${color}55`,
    fontSize: 10, color: '#fff', fontWeight: 600,
    backdropFilter: 'blur(6px)',
    cursor: 'pointer'
  }),
  dot: (color) => ({ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 4px ${color}` }),
  expanded: (opacity) => ({
    position: 'absolute', top: 0, right: 0,
    background: `rgba(10,5,20,${0.92 * opacity})`,
    border: '1px solid rgba(204,136,255,0.4)',
    borderRadius: 12, padding: 12, minWidth: 200,
    backdropFilter: 'blur(12px)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.6)'
  }),
  expandedRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0', fontSize: 10, color: '#f0e8ff' },
  expandedLabel: { display: 'flex', alignItems: 'center', gap: 6, opacity: 0.7 },
  expandedModel: { fontWeight: 700, color: '#fff', fontSize: 10, maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  settingsBtn: { marginTop: 8, padding: '6px 10px', width: '100%', borderRadius: 8, background: 'linear-gradient(135deg,#cc88ff 0%,#7a3acc 100%)', color: '#0a0218', border: 'none', fontSize: 10, fontWeight: 800, cursor: 'pointer', letterSpacing: 0.5 }
};

export default function AiStatusPanel({ onOpenSettings }) {
  const ui = useSettingsStore(s => s.ui);
  const [active, setActive] = useState(getActive());
  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(ui.panelMode !== PANEL_MODE.OFF && ui.panelMode !== PANEL_MODE.FADE && ui.panelMode !== PANEL_MODE.PULSE);
  const fadeTimer = useRef(null);
  const lastIdsRef = useRef({});

  // Subscribe to live provider changes.
  useEffect(() => {
    return onProviderChange((a) => {
      setActive(a);
      // Detect any model switch for FADE / PULSE modes.
      const changed = AGENT_ORDER.some(({ key }) => a[key] !== lastIdsRef.current[key]);
      lastIdsRef.current = { ...a };

      if (ui.panelMode === PANEL_MODE.FADE) {
        setVisible(true);
        clearTimeout(fadeTimer.current);
        fadeTimer.current = setTimeout(() => setVisible(false), ui.fadeAfterMs || 2000);
      } else if (ui.panelMode === PANEL_MODE.PULSE && changed) {
        setVisible(true);
        clearTimeout(fadeTimer.current);
        fadeTimer.current = setTimeout(() => setVisible(false), 900);
      }
    });
  }, [ui.panelMode, ui.fadeAfterMs]);

  // Re-sync visibility when panel mode changes from Settings.
  useEffect(() => {
    if (ui.panelMode === PANEL_MODE.OFF) setVisible(false);
    else if (ui.panelMode === PANEL_MODE.SOLID || ui.panelMode === PANEL_MODE.TRANSLUCENT) setVisible(true);
    else setVisible(false);
  }, [ui.panelMode]);

  // Honor the "hide all HUD" master toggle.
  if (ui.hideAllHud) return null;
  if (ui.panelMode === PANEL_MODE.OFF && !ui.showModelBadgeInGame) return null;

  // Effective opacity per mode.
  let opacity = 1;
  if (ui.panelMode === PANEL_MODE.TRANSLUCENT) opacity = 0.35;
  if (!visible) opacity = 0;
  // If only the corner badge is requested (Q4-C), force visible but respect badge opacity.
  if (ui.panelMode === PANEL_MODE.OFF && ui.showModelBadgeInGame) opacity = ui.modelBadgeOpacity ?? 0.85;

  const pointerEvents = opacity < 0.05 ? 'none' : 'auto';

  // Compact corner badge — shows the most relevant active model (companion > gm > taskgen).
  const primaryKey = ['companion','gm','taskgen','tts','stt'].find(k => active[k]) || 'companion';
  const primaryId = active[primaryKey];
  const primary = primaryId ? byId(primaryId) : null;
  const primaryColor = primaryId ? tierOf(primaryId).color : '#666';

  if (!expanded) {
    return (
      <div style={css.wrap(opacity, pointerEvents)}>
        <div style={css.chip(primaryColor, ui.modelBadgeOpacity ?? 1)} onClick={() => setExpanded(true)} title="Tap to expand">
          <div style={css.dot(primaryColor)} />
          <span>{primary ? primary.label.replace(/\s*\(.*?\)\s*$/, '') : 'idle'}</span>
        </div>
      </div>
    );
  }

  return (
    <div style={css.wrap(opacity, pointerEvents)} onMouseLeave={() => setExpanded(false)}>
      <div style={css.expanded(ui.modelBadgeOpacity ?? 0.92)}>
        {AGENT_ORDER.map(({ key, icon, label }) => {
          const id = active[key];
          const p = id ? byId(id) : null;
          const color = id ? tierOf(id).color : '#444';
          return (
            <div key={key} style={css.expandedRow}>
              <span style={css.expandedLabel}>
                <span style={css.dot(color)} />
                <span>{icon} {label}</span>
              </span>
              <span style={css.expandedModel}>{p ? p.label.replace(/\s*\(.*?\)\s*$/, '') : '—'}</span>
            </div>
          );
        })}
        <button style={css.settingsBtn} onClick={() => { setExpanded(false); onOpenSettings?.(); }}>OPEN SETTINGS</button>
      </div>
    </div>
  );
}
