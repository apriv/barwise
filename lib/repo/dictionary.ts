import type { Database } from "better-sqlite3";

import { getDb } from "@/lib/db/client";

export type LabelCategory = "bar" | "segment" | "context" | "outcome";
export type LabelSource =
  | "manual"
  | "auto_numeric"
  | "nlp"
  | "imported_albrooks"
  | "model_suggested";

export type LabelDictionaryItem = {
  id: number;
  category: LabelCategory;
  group_name: string;
  key: string;
  label: string;
  description: string | null;
  example: string | null;
  field_mapping_json: string;
  sort_order: number;
  is_active: number;
  created_by: string;
  source: LabelSource;
  created_at: number;
  updated_at: number;
};

export type LabelDictionaryItemWithUsage = LabelDictionaryItem & {
  usage_count: number;
};

export type UpsertDictionaryItemInput = {
  category: LabelCategory;
  groupName: string;
  key: string;
  label: string;
  description?: string | null;
  example?: string | null;
  fieldMappingJson?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  createdBy?: string;
  source?: LabelSource;
};

function database(db?: Database) {
  return db ?? getDb();
}

function unixNow() {
  return Math.floor(Date.now() / 1000);
}

export function parseFieldMappingJson(value: string | null | undefined) {
  if (!value || value.trim() === "") {
    return {};
  }

  const parsed: unknown = JSON.parse(value);

  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error("Field mapping must be a JSON object");
  }

  return parsed as Record<string, string>;
}

function assertValidFieldMappingJson(value: string | null | undefined) {
  parseFieldMappingJson(value);
}

export function listActiveDictionaryItems(
  category: LabelCategory,
  db?: Database,
) {
  return database(db)
    .prepare(
      `
      SELECT
        id,
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
      FROM label_dictionary
      WHERE category = ?
        AND is_active = 1
      ORDER BY group_name ASC, sort_order ASC, label ASC
    `,
    )
    .all(category) as LabelDictionaryItem[];
}

export function listDictionaryItems(category?: LabelCategory, db?: Database) {
  const sql = `
    SELECT
      id,
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
    FROM label_dictionary
    ${category ? "WHERE category = ?" : ""}
    ORDER BY category ASC, group_name ASC, sort_order ASC, label ASC
  `;

  const stmt = database(db).prepare(sql);

  return (category ? stmt.all(category) : stmt.all()) as LabelDictionaryItem[];
}

export function getDictionaryItem(
  category: LabelCategory,
  key: string,
  db?: Database,
) {
  return database(db)
    .prepare(
      `
      SELECT
        id,
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
      FROM label_dictionary
      WHERE category = ?
        AND key = ?
    `,
    )
    .get(category, key) as LabelDictionaryItem | undefined;
}

export function getDictionaryItemByKey(key: string, db?: Database) {
  return database(db)
    .prepare(
      `
      SELECT
        id,
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
      FROM label_dictionary
      WHERE key = ?
      ORDER BY category ASC
      LIMIT 1
    `,
    )
    .get(key) as LabelDictionaryItem | undefined;
}

function tableExists(tableName: string, db: Database) {
  return Boolean(
    db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
      )
      .get(tableName),
  );
}

function countTags(
  tableName: string,
  category: LabelCategory,
  counts: Map<string, number>,
  db: Database,
) {
  if (!tableExists(tableName, db)) {
    return;
  }

  const rows = db
    .prepare(`SELECT tag_key, COUNT(*) AS count FROM ${tableName} GROUP BY tag_key`)
    .all() as { tag_key: string; count: number }[];

  for (const row of rows) {
    counts.set(`${category}:${row.tag_key}`, row.count);
  }
}

export function listDictionaryItemsWithUsage(
  category?: LabelCategory,
  db?: Database,
) {
  const targetDb = database(db);
  const items = listDictionaryItems(category, targetDb);
  const counts = new Map<string, number>();

  countTags("bar_tags", "bar", counts, targetDb);
  countTags("segment_tags", "segment", counts, targetDb);
  countTags("context_tags", "context", counts, targetDb);
  countTags("outcome_tags", "outcome", counts, targetDb);

  return items.map((item) => ({
    ...item,
    usage_count: counts.get(`${item.category}:${item.key}`) ?? 0,
  })) as LabelDictionaryItemWithUsage[];
}

export function upsertDictionaryItem(
  input: UpsertDictionaryItemInput,
  db?: Database,
) {
  const now = unixNow();
  const fieldMappingJson = input.fieldMappingJson?.trim() || "{}";

  assertValidFieldMappingJson(fieldMappingJson);

  database(db)
    .prepare(
      `
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (category, key) DO UPDATE SET
        group_name = excluded.group_name,
        label = excluded.label,
        description = excluded.description,
        example = excluded.example,
        field_mapping_json = excluded.field_mapping_json,
        sort_order = excluded.sort_order,
        is_active = excluded.is_active,
        created_by = excluded.created_by,
        source = excluded.source,
        updated_at = excluded.updated_at
    `,
    )
    .run(
      input.category,
      input.groupName,
      input.key,
      input.label,
      input.description ?? null,
      input.example ?? null,
      fieldMappingJson,
      input.sortOrder ?? 0,
      input.isActive === false ? 0 : 1,
      input.createdBy ?? "local",
      input.source ?? "manual",
      now,
      now,
    );
}

export function setDictionaryItemActive(
  category: LabelCategory,
  key: string,
  isActive: boolean,
  db?: Database,
) {
  database(db)
    .prepare(
      `
      UPDATE label_dictionary
      SET is_active = ?,
          updated_at = ?
      WHERE category = ?
        AND key = ?
    `,
    )
    .run(isActive ? 1 : 0, unixNow(), category, key);
}

export function renameDictionaryKey(
  category: LabelCategory,
  oldKey: string,
  newKey: string,
  db?: Database,
) {
  const targetDb = database(db);
  const now = unixNow();

  targetDb
    .transaction(() => {
      targetDb
        .prepare(
          `
          UPDATE label_dictionary
          SET key = ?,
              updated_at = ?
          WHERE category = ?
            AND key = ?
        `,
        )
        .run(newKey, now, category, oldKey);

      if (category === "bar") {
        targetDb
          .prepare("UPDATE bar_tags SET tag_key = ? WHERE tag_key = ?")
          .run(newKey, oldKey);
      }

      if (category === "segment") {
        targetDb
          .prepare("UPDATE segment_tags SET tag_key = ? WHERE tag_key = ?")
          .run(newKey, oldKey);
      }

      if (category === "context") {
        targetDb
          .prepare("UPDATE context_tags SET tag_key = ? WHERE tag_key = ?")
          .run(newKey, oldKey);
      }

      if (category === "outcome") {
        const table = targetDb
          .prepare(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'outcome_tags'",
          )
          .get();

        if (table) {
          targetDb
            .prepare("UPDATE outcome_tags SET tag_key = ? WHERE tag_key = ?")
            .run(newKey, oldKey);
        }
      }
    })();
}
