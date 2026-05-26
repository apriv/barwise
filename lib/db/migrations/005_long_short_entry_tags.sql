-- Split the generic entry bar tag into directional long/short entry tags.

INSERT INTO label_dictionary (
  category,
  group_name,
  key,
  label,
  description,
  example,
  field_mapping_json,
  sort_order,
  is_active,
  created_by,
  source,
  created_at,
  updated_at
) VALUES
  (
    'bar',
    'bar_pattern',
    'long_entry',
    'Long Entry',
    'Bar used as a long entry point.',
    NULL,
    '{"role":"entry","direction":"long"}',
    12,
    1,
    'local',
    'manual',
    CAST(strftime('%s', 'now') AS INTEGER),
    CAST(strftime('%s', 'now') AS INTEGER)
  ),
  (
    'bar',
    'bar_pattern',
    'short_entry',
    'Short Entry',
    'Bar used as a short entry point.',
    NULL,
    '{"role":"entry","direction":"short"}',
    13,
    1,
    'local',
    'manual',
    CAST(strftime('%s', 'now') AS INTEGER),
    CAST(strftime('%s', 'now') AS INTEGER)
  )
ON CONFLICT(category, key) DO UPDATE SET
  group_name = excluded.group_name,
  label = excluded.label,
  description = excluded.description,
  field_mapping_json = excluded.field_mapping_json,
  is_active = 1,
  updated_at = excluded.updated_at;

INSERT OR IGNORE INTO bar_tags (
  bar_id,
  tag_key,
  note,
  created_at,
  updated_at
)
SELECT
  bar_tags.bar_id,
  CASE
    WHEN bars.close >= bars.open THEN 'long_entry'
    ELSE 'short_entry'
  END,
  bar_tags.note,
  bar_tags.created_at,
  CAST(strftime('%s', 'now') AS INTEGER)
FROM bar_tags
INNER JOIN bars ON bars.id = bar_tags.bar_id
WHERE bar_tags.tag_key = 'entry_bar';

DELETE FROM bar_tags
WHERE tag_key = 'entry_bar';

UPDATE label_dictionary
SET is_active = 0,
    updated_at = CAST(strftime('%s', 'now') AS INTEGER)
WHERE category = 'bar'
  AND key = 'entry_bar';
