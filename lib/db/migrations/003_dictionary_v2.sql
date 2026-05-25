-- V2 Dictionary Metadata
-- Promote label_dictionary from a seed-only lookup table to editable tag metadata.

CREATE TABLE label_dictionary_v2 (
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

INSERT INTO label_dictionary_v2 (
  id,
  category,
  group_name,
  key,
  label,
  description,
  sort_order,
  is_active,
  created_by,
  source,
  created_at,
  updated_at
)
SELECT
  id,
  category,
  group_name,
  key,
  label,
  description,
  sort_order,
  is_active,
  'local',
  'manual',
  created_at,
  created_at
FROM label_dictionary;

DROP TABLE label_dictionary;

ALTER TABLE label_dictionary_v2 RENAME TO label_dictionary;

UPDATE label_dictionary
SET key = 'middle_of_day_range',
    label = 'Middle of Day Range',
    group_name = 'context_location',
    updated_at = created_at
WHERE category = 'context'
  AND key = 'middle_of_range';

UPDATE context_tags
SET tag_key = 'middle_of_day_range'
WHERE tag_key = 'middle_of_range';

CREATE INDEX idx_dict_cat_group
  ON label_dictionary(category, group_name, is_active, sort_order);

CREATE INDEX idx_dict_key
  ON label_dictionary(key);

CREATE INDEX idx_dict_source
  ON label_dictionary(source);
