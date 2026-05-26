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
  id                 INTEGER PRIMARY KEY,
  category           TEXT NOT NULL CHECK (category IN ('bar', 'segment', 'context', 'outcome')),
  group_name         TEXT NOT NULL,
  key                TEXT NOT NULL,
  label              TEXT NOT NULL,
  description        TEXT,
  example            TEXT,
  field_mapping_json TEXT NOT NULL DEFAULT '{}',
  sort_order         INTEGER NOT NULL DEFAULT 0,
  is_active          INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_by         TEXT NOT NULL DEFAULT 'local',
  source             TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'auto_numeric', 'nlp', 'imported_albrooks', 'model_suggested')),
  created_at         INTEGER NOT NULL,
  updated_at         INTEGER NOT NULL,
  UNIQUE (category, key)
);

CREATE INDEX IF NOT EXISTS idx_dict_cat_group
  ON label_dictionary(category, group_name, is_active, sort_order);

CREATE INDEX IF NOT EXISTS idx_dict_key
  ON label_dictionary(key);

CREATE INDEX IF NOT EXISTS idx_dict_source
  ON label_dictionary(source);

CREATE TABLE IF NOT EXISTS bar_tags (
  id          INTEGER PRIMARY KEY,
  bar_id      INTEGER NOT NULL REFERENCES bars(id) ON DELETE CASCADE,
  tag_key     TEXT NOT NULL,
  note        TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  UNIQUE (bar_id, tag_key)
);

CREATE INDEX IF NOT EXISTS idx_bar_tags_bar
  ON bar_tags(bar_id);

CREATE INDEX IF NOT EXISTS idx_bar_tags_key
  ON bar_tags(tag_key);

CREATE TABLE IF NOT EXISTS context_tags (
  id          INTEGER PRIMARY KEY,
  bar_id      INTEGER NOT NULL REFERENCES bars(id) ON DELETE CASCADE,
  tag_key     TEXT NOT NULL,
  note        TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  UNIQUE (bar_id, tag_key)
);

CREATE INDEX IF NOT EXISTS idx_ctx_tags_bar
  ON context_tags(bar_id);

CREATE INDEX IF NOT EXISTS idx_ctx_tags_key
  ON context_tags(tag_key);

CREATE TABLE IF NOT EXISTS segment_tags (
  id              INTEGER PRIMARY KEY,
  session_id      INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  start_bar_id    INTEGER NOT NULL REFERENCES bars(id),
  end_bar_id      INTEGER NOT NULL REFERENCES bars(id),
  tag_key         TEXT NOT NULL,
  note            TEXT,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL,
  UNIQUE (start_bar_id, end_bar_id, tag_key)
);

CREATE INDEX IF NOT EXISTS idx_seg_tags_session
  ON segment_tags(session_id);

CREATE INDEX IF NOT EXISTS idx_seg_tags_range
  ON segment_tags(start_bar_id, end_bar_id);

CREATE INDEX IF NOT EXISTS idx_seg_tags_key
  ON segment_tags(tag_key);

CREATE TABLE IF NOT EXISTS outcome_tags (
  id                     INTEGER PRIMARY KEY,
  session_id             INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  start_bar_id           INTEGER NOT NULL REFERENCES bars(id),
  end_bar_id             INTEGER NOT NULL REFERENCES bars(id),
  confirm_bar_id         INTEGER REFERENCES bars(id),
  related_context_bar_id INTEGER REFERENCES bars(id),
  tag_key                TEXT NOT NULL,
  note                   TEXT,
  source                 TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'auto_numeric', 'nlp', 'imported_albrooks', 'model_suggested')),
  created_at             INTEGER NOT NULL,
  updated_at             INTEGER NOT NULL,
  UNIQUE (start_bar_id, end_bar_id, tag_key)
);

CREATE INDEX IF NOT EXISTS idx_outcome_tags_session
  ON outcome_tags(session_id);

CREATE INDEX IF NOT EXISTS idx_outcome_tags_range
  ON outcome_tags(start_bar_id, end_bar_id);

CREATE INDEX IF NOT EXISTS idx_outcome_tags_confirm_bar
  ON outcome_tags(confirm_bar_id);

CREATE INDEX IF NOT EXISTS idx_outcome_tags_key
  ON outcome_tags(tag_key);

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
