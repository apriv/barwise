-- Ensure expanding triangle is available as a segment tag.

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
  'segment',
  'segment',
  'expanding_triangle',
  'Expanding Triangle',
  'Expanding structure with widening highs and lows.',
  NULL,
  '{"structure":"expanding_triangle"}',
  29,
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
