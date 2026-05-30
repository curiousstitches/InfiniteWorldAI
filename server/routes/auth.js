// server/routes/auth.js
// Accounts so a companion follows the user across devices. Passwords are hashed with
// Node's built-in scrypt (never stored raw). Sessions use a signed token. Includes a
// private admin endpoint to view the user log, gated by ADMIN_PASSWORD (Railway secret).

import express from 'express';
import crypto from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import { run, get, query } from '../db/client.js';

export const authRouter = express.Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '015060';
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'iw-dev-secret-change-me';

// ── Password hashing (scrypt) ──
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  try {
    const [salt, hash] = stored.split(':');
    const test = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(test, 'hex'));
  } catch { return false; }
}

// ── Simple signed session token (userId.expiry.signature) ──
function makeToken(userId) {
  const exp = Date.now() + 1000 * 60 * 60 * 24 * 60; // 60 days
  const payload = `${userId}.${exp}`;
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}
function verifyToken(token) {
  try {
    const [userId, exp, sig] = (token || '').split('.');
    const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(`${userId}.${exp}`).digest('hex');
    if (sig !== expected) return null;
    if (Date.now() > Number(exp)) return null;
    return userId;
  } catch { return null; }
}

// Middleware: attach req.userId if a valid token is present.
export function authOptional(req, _res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  req.userId = verifyToken(token);
  next();
}

const validEmail = (e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e || '');

// ── Sign up ──
authRouter.post('/signup', (req, res) => {
  const { email, password } = req.body || {};
  if (!validEmail(email)) return res.status(400).json({ error: 'invalid-email' });
  if (!password || password.length < 4) return res.status(400).json({ error: 'password-too-short' });
  const existing = get('SELECT id FROM users WHERE email=?', [String(email).toLowerCase()]);
  if (existing) return res.status(409).json({ error: 'email-taken' });
  const id = uuidv4();
  run('INSERT INTO users(id,email,pass_hash) VALUES(?,?,?)',
    [id, String(email).toLowerCase(), hashPassword(password)]);
  res.json({ token: makeToken(id), email: String(email).toLowerCase() });
});

// ── Log in ──
authRouter.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  const u = get('SELECT * FROM users WHERE email=?', [String(email || '').toLowerCase()]);
  if (!u || !verifyPassword(password, u.pass_hash)) {
    return res.status(401).json({ error: 'bad-credentials' });
  }
  run('UPDATE users SET last_seen=unixepoch() WHERE id=?', [u.id]);
  res.json({ token: makeToken(u.id), email: u.email });
});

// ── Slots: list / save / load (require auth) ──
authRouter.get('/slots', authOptional, (req, res) => {
  if (!req.userId) return res.status(401).json({ error: 'not-logged-in' });
  const rows = query('SELECT slot_index, label, updated_at FROM save_slots WHERE user_id=? ORDER BY slot_index', [req.userId]);
  res.json({ slots: rows });
});

authRouter.put('/slots/:index', authOptional, (req, res) => {
  if (!req.userId) return res.status(401).json({ error: 'not-logged-in' });
  const idx = Math.max(0, Math.min(2, parseInt(req.params.index, 10) || 0));
  const { label, data } = req.body || {};
  const existing = get('SELECT id FROM save_slots WHERE user_id=? AND slot_index=?', [req.userId, idx]);
  const json = JSON.stringify(data || {});
  if (existing) {
    run('UPDATE save_slots SET label=?, data=?, updated_at=unixepoch() WHERE id=?', [label || '', json, existing.id]);
  } else {
    run('INSERT INTO save_slots(id,user_id,slot_index,label,data) VALUES(?,?,?,?,?)',
      [uuidv4(), req.userId, idx, label || '', json]);
    run('UPDATE users SET world_count=(SELECT COUNT(*) FROM save_slots WHERE user_id=?) WHERE id=?', [req.userId, req.userId]);
  }
  res.json({ ok: true });
});

authRouter.get('/slots/:index', authOptional, (req, res) => {
  if (!req.userId) return res.status(401).json({ error: 'not-logged-in' });
  const idx = Math.max(0, Math.min(2, parseInt(req.params.index, 10) || 0));
  const row = get('SELECT label, data, updated_at FROM save_slots WHERE user_id=? AND slot_index=?', [req.userId, idx]);
  if (!row) return res.json({ slot: null });
  res.json({ slot: { label: row.label, data: JSON.parse(row.data || '{}'), updated_at: row.updated_at } });
});

authRouter.delete('/slots/:index', authOptional, (req, res) => {
  if (!req.userId) return res.status(401).json({ error: 'not-logged-in' });
  const idx = Math.max(0, Math.min(2, parseInt(req.params.index, 10) || 0));
  run('DELETE FROM save_slots WHERE user_id=? AND slot_index=?', [req.userId, idx]);
  res.json({ ok: true });
});

// ── Private admin: view the user log. Gated by ADMIN_PASSWORD. ──
authRouter.post('/admin/users', (req, res) => {
  const { password } = req.body || {};
  if (password !== ADMIN_PASSWORD) return res.status(403).json({ error: 'forbidden' });
  const users = query(`SELECT email, created_at, last_seen, world_count FROM users ORDER BY created_at DESC`);
  res.json({ count: users.length, users });
});
