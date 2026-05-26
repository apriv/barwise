-- Split the generic wedge segment tag into directional wedge up/down tags.

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
    'wedge_up',
    'Wedge Up',
    'Wedge structure drawn across swing highs.',
    NULL,
    '{"structure":"wedge","direction":"up"}',
    27,
    1,
    'local',
    'manual',
    CAST(strftime('%s', 'now') AS INTEGER),
    CAST(strftime('%s', 'now') AS INTEGER)
  ),
  (
    'segment',
    'segment',
    'wedge_down',
    'Wedge Down',
    'Wedge structure drawn across swing lows.',
    NULL,
    '{"structure":"wedge","direction":"down"}',
    28,
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

UPDATE label_dictionary
SET is_active = 0,
    updated_at = CAST(strftime('%s', 'now') AS INTEGER)
WHERE category = 'segment'
  AND key = 'wedge';
