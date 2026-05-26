-- Rename the visible label for the existing spike tag to Climax.
-- The key remains "spike" so existing annotations continue to resolve.

UPDATE label_dictionary
SET label = 'Climax',
    description = 'Sharp climactic directional move.',
    field_mapping_json = '{"structure":"climax"}',
    updated_at = CAST(strftime('%s', 'now') AS INTEGER)
WHERE category = 'segment'
  AND key = 'spike';
