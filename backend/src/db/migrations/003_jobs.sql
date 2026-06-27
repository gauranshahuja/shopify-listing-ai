-- Background job queue: lets a user submit several brands at once; an in-process
-- worker drains them one at a time so a slow/AI run doesn't block the request.
-- The finished CSV lands in history (with the 4-hour download window).
CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  host TEXT NOT NULL,
  all_pages INTEGER NOT NULL DEFAULT 1,
  enrich INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',   -- pending | running | done | error
  error TEXT,
  history_id INTEGER,                        -- the history row holding the CSV
  product_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_jobs_user ON jobs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
