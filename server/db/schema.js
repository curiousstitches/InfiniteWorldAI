export const SCHEMA = `
  CREATE TABLE IF NOT EXISTS worlds (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch()),
    biome TEXT DEFAULT 'forest',
    scale TEXT DEFAULT 'HUMAN',
    weather TEXT DEFAULT 'clear',
    time_of_day REAL DEFAULT 0.5,
    location_name TEXT DEFAULT 'The Unknown',
    mood TEXT DEFAULT 'neutral',
    is_active INTEGER DEFAULT 1,
    legacy_seed TEXT
  );

  CREATE TABLE IF NOT EXISTS characters (
    id TEXT PRIMARY KEY,
    world_id TEXT REFERENCES worlds(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    race TEXT NOT NULL,
    personality TEXT NOT NULL,
    appearance TEXT NOT NULL,
    voice_id TEXT,
    model_url TEXT,
    model_status TEXT DEFAULT 'pending',
    traits TEXT DEFAULT '[]',
    metadata TEXT DEFAULT '{}',
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    world_id TEXT REFERENCES worlds(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK(role IN ('player','companion','gm','system')),
    content TEXT NOT NULL,
    emotion TEXT,
    timestamp INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    world_id TEXT REFERENCES worlds(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    hints TEXT DEFAULT '[]',
    difficulty TEXT DEFAULT 'medium',
    type TEXT DEFAULT 'exploration',
    status TEXT DEFAULT 'active' CHECK(status IN ('active','completed','failed','hidden')),
    created_at INTEGER DEFAULT (unixepoch()),
    completed_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS interactables (
    id TEXT PRIMARY KEY,
    world_id TEXT REFERENCES worlds(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    label TEXT NOT NULL,
    description TEXT NOT NULL,
    position_x REAL DEFAULT 0,
    position_y REAL DEFAULT 0,
    position_z REAL DEFAULT 0,
    mesh_type TEXT DEFAULT 'sphere',
    color TEXT DEFAULT '#8B4513',
    is_active INTEGER DEFAULT 1,
    metadata TEXT DEFAULT '{}'
  );

  CREATE TABLE IF NOT EXISTS legacy_echoes (
    id TEXT PRIMARY KEY,
    source_world_id TEXT NOT NULL,
    echo_type TEXT NOT NULL,
    content TEXT NOT NULL,
    discovered INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS world_settings (
    world_id TEXT PRIMARY KEY REFERENCES worlds(id) ON DELETE CASCADE,
    personality TEXT DEFAULT '{}',
    provider_picks TEXT DEFAULT '{}',
    ui_prefs TEXT DEFAULT '{}',
    updated_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS companion_state (
    world_id TEXT PRIMARY KEY REFERENCES worlds(id) ON DELETE CASCADE,
    affection INTEGER DEFAULT 50,
    trust INTEGER DEFAULT 50,
    current_mood TEXT DEFAULT 'neutral',
    last_provider_id TEXT,
    updated_at INTEGER DEFAULT (unixepoch())
  );

  CREATE INDEX IF NOT EXISTS idx_conversations_world ON conversations(world_id, timestamp);
  CREATE INDEX IF NOT EXISTS idx_tasks_world ON tasks(world_id, status);
  CREATE INDEX IF NOT EXISTS idx_interactables_world ON interactables(world_id, is_active);

  -- ── Accounts: login so a companion follows the user across devices ──
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    pass_hash TEXT NOT NULL,        -- scrypt hash (never the raw password)
    created_at INTEGER DEFAULT (unixepoch()),
    last_seen INTEGER DEFAULT (unixepoch()),
    world_count INTEGER DEFAULT 0
  );

  -- ── Save slots: 3 per user, each its own world + companion + memory + stats ──
  CREATE TABLE IF NOT EXISTS save_slots (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slot_index INTEGER NOT NULL,   -- 0,1,2
    label TEXT,
    data TEXT DEFAULT '{}',        -- JSON blob: world + character + memory + lifesim
    updated_at INTEGER DEFAULT (unixepoch()),
    UNIQUE(user_id, slot_index)
  );
  CREATE INDEX IF NOT EXISTS idx_slots_user ON save_slots(user_id);
`;
