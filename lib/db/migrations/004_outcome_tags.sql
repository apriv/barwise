-- V2 Outcome Tags
-- After-the-fact result labels attached to a selected bar range.

CREATE TABLE outcome_tags (
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

CREATE INDEX idx_outcome_tags_session
  ON outcome_tags(session_id);

CREATE INDEX idx_outcome_tags_range
  ON outcome_tags(start_bar_id, end_bar_id);

CREATE INDEX idx_outcome_tags_confirm_bar
  ON outcome_tags(confirm_bar_id);

CREATE INDEX idx_outcome_tags_key
  ON outcome_tags(tag_key);
