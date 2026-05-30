// client/src/components/LoginModal.jsx
// Optional account: lets a player's companion follow them across devices. Email + password.
// Includes a clear "not for sensitive passwords" notice. Players can skip and stay local.

import { useState } from 'react';
import { signup, login } from '../services/authClient.js';

export default function LoginModal({ onDone, onSkip }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    setErr(''); setBusy(true);
    try {
      if (mode === 'signup') await signup(email.trim(), password);
      else await login(email.trim(), password);
      onDone?.();
    } catch (e) {
      const map = {
        'email-taken': 'That email already has an account — try logging in.',
        'bad-credentials': 'Email or password is wrong.',
        'invalid-email': 'That email doesn\'t look right.',
        'password-too-short': 'Password needs at least 4 characters.',
      };
      setErr(map[e.message] || 'Something went wrong. Try again.');
    } finally { setBusy(false); }
  };

  return (
    <div style={S.overlay}>
      <div style={S.card}>
        <div style={S.title}>{mode === 'signup' ? 'Create account' : 'Welcome back'}</div>
        <div style={S.sub}>Sign in so your companion remembers you on any device.</div>

        <input style={S.input} type="email" placeholder="Email" value={email}
          onChange={e => setEmail(e.target.value)} autoComplete="email" />
        <input style={S.input} type="password" placeholder="Password" value={password}
          onChange={e => setPassword(e.target.value)} autoComplete="current-password" />

        {err && <div style={S.err}>{err}</div>}

        <button style={S.primary} onClick={submit} disabled={busy}>
          {busy ? '…' : mode === 'signup' ? 'Create account' : 'Log in'}
        </button>

        <button style={S.switch} onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setErr(''); }}>
          {mode === 'signup' ? 'Already have an account? Log in' : 'New here? Create an account'}
        </button>

        <button style={S.skip} onClick={onSkip}>Skip — play without an account</button>

        <div style={S.notice}>
          ⚠ This is a fun game, not a bank. Please <b>don't reuse an important password</b>.
          Accounts are stored privately by the creator.
        </div>
      </div>
    </div>
  );
}

const S = {
  overlay: { position: 'fixed', inset: 0, zIndex: 520, background: 'rgba(5,2,15,0.9)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    fontFamily: 'system-ui, sans-serif', overflowY: 'auto' },
  card: { width: '100%', maxWidth: 380, background: 'linear-gradient(160deg,#1e0a42,#0a0418)',
    border: '1px solid rgba(204,136,255,0.4)', borderRadius: 18, padding: 24,
    boxShadow: '0 0 60px rgba(120,40,200,0.4)' },
  title: { color: '#fff', fontSize: 22, fontWeight: 800, marginBottom: 4 },
  sub: { color: 'rgba(220,200,255,0.7)', fontSize: 13.5, marginBottom: 18, lineHeight: 1.5 },
  input: { width: '100%', boxSizing: 'border-box', padding: '13px 14px', marginBottom: 10,
    borderRadius: 10, border: '1.5px solid rgba(204,136,255,0.4)', background: 'rgba(255,255,255,0.07)',
    color: '#f0e0ff', fontSize: 16 },
  err: { color: '#ff9b9b', fontSize: 13, marginBottom: 10, background: 'rgba(255,60,60,0.12)',
    padding: '8px 12px', borderRadius: 8 },
  primary: { width: '100%', padding: '14px', borderRadius: 12, border: 'none', cursor: 'pointer',
    background: 'linear-gradient(135deg,#cc88ff,#7a3acc)', color: '#0a0218', fontSize: 15, fontWeight: 800, marginBottom: 10 },
  switch: { width: '100%', padding: '10px', background: 'transparent', border: 'none', cursor: 'pointer',
    color: '#88ddff', fontSize: 13.5, marginBottom: 4 },
  skip: { width: '100%', padding: '11px', background: 'transparent', cursor: 'pointer',
    border: '1px solid rgba(204,136,255,0.3)', borderRadius: 10, color: 'rgba(204,136,255,0.85)', fontSize: 13.5 },
  notice: { marginTop: 16, color: 'rgba(255,204,102,0.85)', fontSize: 11.5, lineHeight: 1.5,
    background: 'rgba(255,204,102,0.08)', border: '1px solid rgba(255,204,102,0.25)', borderRadius: 10, padding: 10 },
};
