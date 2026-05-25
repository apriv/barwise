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

export type DictionaryGroupStats = {
  category: LabelCategory;
  group_name: string;
  tag_count: number;
  active_count: number;
  usage_count: number;
};

export type DictionarySuggestion = {
  kind:
    | "too_common"
    | "rarely_used"
    | "duplicate_mapping"
    | "inactive_referenced"
    | "group_too_large";
  category: LabelCategory;
  group_name: string;
  key?: string;
  label: string;
  detail: string;
  usage_count: number;
  related_keys?: string[];
};

export type DictionaryStats = {
  tag_count: number;
  active_count: number;
  inactive_count: number;
  usage_count: number;
  group_stats: DictionaryGroupStats[];
  suggestions: DictionarySuggestion[];
};

export type TagSessionUsage = {
  session_id: number;
  session_date: string;
  count: number;
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

function normalizeMapping(value: string) {
  try {
    return JSON.stringify(parseFieldMappingJson(value));
  } catch {
    return value.trim();
  }
}

function buildGroupStats(items: LabelDictionaryItemWithUsage[]) {
  const groups = new Map<string, DictionaryGroupStats>();

  for (const item of items) {
    const key = `${item.category}:${item.group_name}`;
    const current =
      groups.get(key) ??
      ({
        category: item.category,
        group_name: item.group_name,
        tag_count: 0,
        active_count: 0,
        usage_count: 0,
      } satisfies DictionaryGroupStats);

    current.tag_count += 1;
    current.active_count += item.is_active ? 1 : 0;
    current.usage_count += item.usage_count;
    groups.set(key, current);
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.group_name.localeCompare(b.group_name);
  });
}

function buildSuggestions(
  items: LabelDictionaryItemWithUsage[],
  groupStats: DictionaryGroupStats[],
) {
  const suggestions: DictionarySuggestion[] = [];
  const activeItems = items.filter((item) => item.is_active);
  const totalUsage = items.reduce((sum, item) => sum + item.usage_count, 0);
  const commonThreshold = Math.max(5, Math.ceil(totalUsage * 0.2));

  for (const item of activeItems) {
    if (item.usage_count >= commonThreshold) {
      suggestions.push({
        kind: "too_common",
        category: item.category,
        group_name: item.group_name,
        key: item.key,
        label: item.label,
        detail: "High usage; consider whether this tag should be split into more precise tags.",
        usage_count: item.usage_count,
      });
    }

    if (item.usage_count === 0) {
      suggestions.push({
        kind: "rarely_used",
        category: item.category,
        group_name: item.group_name,
        key: item.key,
        label: item.label,
        detail: "No saved annotations currently use this active tag.",
        usage_count: item.usage_count,
      });
    }
  }

  for (const item of items) {
    if (!item.is_active && item.usage_count > 0) {
      suggestions.push({
        kind: "inactive_referenced",
        category: item.category,
        group_name: item.group_name,
        key: item.key,
        label: item.label,
        detail: "Inactive tag still appears in historical annotations.",
        usage_count: item.usage_count,
      });
    }
  }

  const byMapping = new Map<string, LabelDictionaryItemWithUsage[]>();
  for (const item of activeItems) {
    const mappingKey = `${item.category}:${normalizeMapping(item.field_mapping_json)}`;
    byMapping.set(mappingKey, [...(byMapping.get(mappingKey) ?? []), item]);
  }

  for (const duplicates of byMapping.values()) {
    if (duplicates.length < 2) continue;
    const [first] = duplicates;
    suggestions.push({
      kind: "duplicate_mapping",
      category: first.category,
      group_name: first.group_name,
      key: first.key,
      label: first.label,
      detail: "Multiple active tags have the same field mapping.",
      usage_count: duplicates.reduce((sum, item) => sum + item.usage_count, 0),
      related_keys: duplicates.map((item) => item.key),
    });
  }

  for (const group of groupStats) {
    if (group.active_count > 12) {
      suggestions.push({
        kind: "group_too_large",
        category: group.category,
        group_name: group.group_name,
        label: group.group_name,
        detail: "Large active group; consider splitting it into smaller UI groups.",
        usage_count: group.usage_count,
      });
    }
  }

  return suggestions.sort((a, b) => {
    const severity = {
      inactive_referenced: 0,
      duplicate_mapping: 1,
      too_common: 2,
      group_too_large: 3,
      rarely_used: 4,
    } satisfies Record<DictionarySuggestion["kind"], number>;

    return severity[a.kind] - severity[b.kind] || b.usage_count - a.usage_count;
  });
}

export function getDictionaryStats(category?: LabelCategory, db?: Database) {
  const items = listDictionaryItemsWithUsage(category, db);
  const groupStats = buildGroupStats(items);

  return {
    tag_count: items.length,
    active_count: items.filter((item) => item.is_active).length,
    inactive_count: items.filter((item) => !item.is_active).length,
    usage_count: items.reduce((sum, item) => sum + item.usage_count, 0),
    group_stats: groupStats,
    suggestions: buildSuggestions(items, groupStats),
  } satisfies DictionaryStats;
}

export function listRecentUsageForTag(
  category: LabelCategory,
  key: string,
  limit = 8,
  db?: Database,
) {
  const targetDb = database(db);

  if (category === "bar" || category === "context") {
    const table = category === "bar" ? "bar_tags" : "context_tags";
    if (!tableExists(table, targetDb)) return [] as TagSessionUsage[];

    return targetDb
      .prepare(
        `
        SELECT
          sessions.id AS session_id,
          sessions.session_date,
          COUNT(*) AS count
        FROM ${table}
        INNER JOIN bars ON bars.id = ${table}.bar_id
        INNER JOIN sessions ON sessions.id = bars.session_id
        WHERE ${table}.tag_key = ?
        GROUP BY sessions.id
        ORDER BY sessions.session_date DESC
        LIMIT ?
      `,
      )
      .all(key, limit) as TagSessionUsage[];
  }

  const table = category === "segment" ? "segment_tags" : "outcome_tags";
  if (!tableExists(table, targetDb)) return [] as TagSessionUsage[];

  return targetDb
    .prepare(
      `
      SELECT
        sessions.id AS session_id,
        sessions.session_date,
        COUNT(*) AS count
      FROM ${table}
      INNER JOIN sessions ON sessions.id = ${table}.session_id
      WHERE ${table}.tag_key = ?
      GROUP BY sessions.id
      ORDER BY sessions.session_date DESC
      LIMIT ?
    `,
    )
    .all(key, limit) as TagSessionUsage[];
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
