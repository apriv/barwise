-- Climax is a bar-level tag. Keep the segment spike tag as Spike and add
-- a separate bar climax tag for single-candle climax annotations.

UPDATE label_dictionary
SET label = 'Spike',
    description = 'Sharp directional move.',
    field_mapping_json = '{"structure":"spike"}',
    is_active = 1,
    updated_at = CAST(strftime('%s', 'now') AS INTEGER)
WHERE category = 'segment'
  AND key = 'spike';

UPDATE segment_tags
SET tag_key = 'spike'
WHERE tag_key = 'climax';

UPDATE label_dictionary
SET is_active = 0,
    updated_at = CAST(strftime('%s', 'now') AS INTEGER)
WHERE category = 'segment'
  AND key = 'climax';

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
) VALUES (
  'bar',
  'bar_pattern',
  'climax',
  'Climax',
  'Single bar with climactic buying or selling pressure.',
  NULL,
  '{"role":"climax"}',
  12,
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
