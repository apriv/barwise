-- M3 Tag Model Migration
-- Replace field+value labels with tag-only model (multi-tag support)

-- Drop old label tables
DROP TABLE IF EXISTS context_labels;
DROP TABLE IF EXISTS segment_labels;
DROP TABLE IF EXISTS bar_labels;

-- Recreate label_dictionary with group_name instead of field
DROP TABLE IF EXISTS label_dictionary;

CREATE TABLE label_dictionary (
  id          INTEGER PRIMARY KEY,
  category    TEXT NOT NULL,               -- 'bar' | 'segment' | 'context'
  group_name  TEXT NOT NULL,               -- UI grouping: bar_shape | bar_pattern | segment | context_market | context_event | context_location
  key         TEXT NOT NULL,               -- visible tag key, e.g. 'strong_bull_bar'
  label       TEXT NOT NULL,               -- display name
  description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  INTEGER NOT NULL,
  UNIQUE (category, key)
);

CREATE INDEX idx_dict_cat_group
  ON label_dictionary(category, group_name, is_active, sort_order);

-- Create new tag tables
CREATE TABLE bar_tags (
  id          INTEGER PRIMARY KEY,
  bar_id      INTEGER NOT NULL REFERENCES bars(id) ON DELETE CASCADE,
  tag_key     TEXT NOT NULL,               -- dictionary key
  note        TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  UNIQUE (bar_id, tag_key)
);

CREATE INDEX idx_bar_tags_bar
  ON bar_tags(bar_id);

CREATE INDEX idx_bar_tags_key
  ON bar_tags(tag_key);

CREATE TABLE segment_tags (
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

CREATE INDEX idx_seg_tags_session
  ON segment_tags(session_id);

CREATE INDEX idx_seg_tags_range
  ON segment_tags(start_bar_id, end_bar_id);

CREATE INDEX idx_seg_tags_key
  ON segment_tags(tag_key);

CREATE TABLE context_tags (
  id          INTEGER PRIMARY KEY,
  bar_id      INTEGER NOT NULL REFERENCES bars(id) ON DELETE CASCADE,
  tag_key     TEXT NOT NULL,
  note        TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  UNIQUE (bar_id, tag_key)
);

CREATE INDEX idx_ctx_tags_bar
  ON context_tags(bar_id);

CREATE INDEX idx_ctx_tags_key
  ON context_tags(tag_key);
