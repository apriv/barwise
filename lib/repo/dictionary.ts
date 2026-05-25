import type { Database } from "better-sqlite3";

import { getDb } from "@/lib/db/client";

export type LabelCategory = "bar" | "segment" | "context";

export type LabelDictionaryItem = {
  id: number;
  category: LabelCategory;
  group_name: string;
  key: string;
  label: string;
  description: string | null;
  sort_order: number;
};

function database(db?: Database) {
  return db ?? getDb();
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
        sort_order
      FROM label_dictionary
      WHERE category = ?
        AND is_active = 1
      ORDER BY group_name ASC, sort_order ASC, label ASC
    `,
    )
    .all(category) as LabelDictionaryItem[];
}
