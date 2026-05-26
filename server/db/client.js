// SQLite via WASM — no native compile required.
// Works on Termux, Render, Railway, Cloudflare Workers (via node-sqlite3-wasm).
import { Database } from 'node-sqlite3-wasm';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import { SCHEMA } from './schema.js';

const DB_PATH = process.env.DB_PATH || './data/infiniteworlds.db';
mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');
db.exec(SCHEMA);

export const query = (sql, params = []) => db.prepare(sql).all(params);
export const run   = (sql, params = []) => db.prepare(sql).run(params);
export const get   = (sql, params = []) => db.prepare(sql).get(params);
export const transaction = (fn) => {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { db.exec('ROLLBACK'); throw e; }
};

export default db;
