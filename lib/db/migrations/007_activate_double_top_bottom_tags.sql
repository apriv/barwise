-- Ensure double top/bottom segment tags are active in existing local databases.

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
    'segment',
    'segment',
    'double_top',
    'Double Top',
    'Two pushes up to a similar price area.',
    NULL,
    '{"structure":"double_top","direction":"bear"}',
    25,
    1,
    'local',
    'manual',
    CAST(strftime('%s', 'now') AS INTEGER),
    CAST(strftime('%s', 'now') AS INTEGER)
  ),
  (
    'segment',
    'segment',
    'double_bottom',
    'Double Bottom',
    'Two pushes down to a similar price area.',
    NULL,
    '{"structure":"double_bottom","direction":"bull"}',
    26,
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
