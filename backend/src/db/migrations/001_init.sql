-- Listify

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  firebase_uid TEXT UNIQUE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  last_login_at TEXT
);

CREATE TABLE history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  mode TEXT NOT NULL,              -- 'store' | 'product' | 'csv'
  host TEXT NOT NULL,
  handle TEXT,
  vendor TEXT,
  product_count INTEGER DEFAULT 0,
  variant_count INTEGER DEFAULT 0,
  image_count INTEGER DEFAULT 0,
  duration_ms INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_history_user ON history(user_id);
CREATE INDEX idx_history_date ON history(created_at DESC);

-- Mappings (category/tag rules — imported via admin panel)
CREATE TABLE mappings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT,
  brand TEXT,
  title TEXT,
  handle TEXT UNIQUE,
  type TEXT,
  category TEXT,
  tags TEXT,
  keywords TEXT,  -- JSON array
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_mappings_handle ON mappings(handle);
CREATE INDEX idx_mappings_brand_title ON mappings(lower(brand), lower(title));
CREATE INDEX idx_mappings_title ON mappings(lower(title));

CREATE TABLE type_to_category (
  type TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  count INTEGER DEFAULT 1
);
