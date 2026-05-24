CREATE TABLE IF NOT EXISTS instruments (
  id          INTEGER PRIMARY KEY,
  symbol      TEXT NOT NULL UNIQUE,
  description TEXT,
  tick_size   REAL NOT NULL,
  tick_value  REAL,
  timezone    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id            INTEGER PRIMARY KEY,
  instrument_id INTEGER NOT NULL REFERENCES instruments(id),
  session_date  TEXT NOT NULL,
  session_type  TEXT NOT NULL,
  start_ts      INTEGER NOT NULL,
  end_ts        INTEGER NOT NULL,
  bar_count     INTEGER NOT NULL,
  imported_at   INTEGER NOT NULL,
  source_file   TEXT,
  UNIQUE (instrument_id, session_date, session_type)
);

CREATE INDEX IF NOT EXISTS idx_sessions_date
  ON sessions(session_date DESC);

CREATE TABLE IF NOT EXISTS bars (
  id          INTEGER PRIMARY KEY,
  session_id  INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  bar_number  INTEGER NOT NULL,
  ts          INTEGER NOT NULL,
  open        REAL NOT NULL,
  high        REAL NOT NULL,
  low         REAL NOT NULL,
  close       REAL NOT NULL,
  volume      INTEGER,
  UNIQUE (session_id, bar_number),
  UNIQUE (session_id, ts)
);

CREATE INDEX IF NOT EXISTS idx_bars_session
  ON bars(session_id, bar_number);

CREATE TABLE IF NOT EXISTS label_dictionary (
  id          INTEGER PRIMARY KEY,
  category    TEXT NOT NULL,
  field       TEXT NOT NULL,
  key         TEXT NOT NULL,
  label       TEXT NOT NULL,
  description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  INTEGER NOT NULL,
  UNIQUE (category, field, key)
);

CREATE INDEX IF NOT EXISTS idx_dict_cat_field
  ON label_dictionary(category, field, is_active);

CREATE TABLE IF NOT EXISTS bar_labels (
  id          INTEGER PRIMARY KEY,
  bar_id      INTEGER NOT NULL REFERENCES bars(id) ON DELETE CASCADE,
  field       TEXT NOT NULL,
  value       TEXT NOT NULL,
  note        TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  UNIQUE (bar_id, field)
);

CREATE INDEX IF NOT EXISTS idx_bar_labels_bar
  ON bar_labels(bar_id);

CREATE INDEX IF NOT EXISTS idx_bar_labels_value
  ON bar_labels(field, value);

CREATE TABLE IF NOT EXISTS segment_labels (
  id              INTEGER PRIMARY KEY,
  session_id      INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  start_bar_id    INTEGER NOT NULL REFERENCES bars(id),
  end_bar_id      INTEGER NOT NULL REFERENCES bars(id),
  field           TEXT NOT NULL,
  value           TEXT NOT NULL,
  direction       TEXT,
  note            TEXT,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_seg_session
  ON segment_labels(session_id);

CREATE INDEX IF NOT EXISTS idx_seg_range
  ON segment_labels(start_bar_id, end_bar_id);

CREATE INDEX IF NOT EXISTS idx_seg_value
  ON segment_labels(field, value);

CREATE TABLE IF NOT EXISTS context_labels (
  id          INTEGER PRIMARY KEY,
  bar_id      INTEGER NOT NULL REFERENCES bars(id) ON DELETE CASCADE,
  field       TEXT NOT NULL,
  value       TEXT NOT NULL,
  note        TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  UNIQUE (bar_id, field)
);

CREATE INDEX IF NOT EXISTS idx_ctx_bar
  ON context_labels(bar_id);

CREATE INDEX IF NOT EXISTS idx_ctx_value
  ON context_labels(field, value);

CREATE TABLE IF NOT EXISTS schema_migrations (
  version     INTEGER PRIMARY KEY,
  applied_at  INTEGER NOT NULL,
  name        TEXT NOT NULL
);

INSERT OR IGNORE INTO instruments (
  symbol,
  description,
  tick_size,
  tick_value,
  timezone
) VALUES (
  'ES',
  'E-mini S&P 500 Futures',
  0.25,
  12.5,
  'America/Chicago'
);
