import type { Database } from "better-sqlite3";

import { getDb } from "@/lib/db/client";

// M3 Tag Model - New types for bar_tags
export type BarTagRecord = {
  id: number;
  bar_id: number;
  bar_number: number;
  tag_key: string;
  tag_label: string;
  note: string | null;
  created_at: number;
  updated_at: number;
};

export type ContextTagRecord = {
  id: number;
  bar_id: number;
  bar_number: number;
  tag_key: string;
  tag_label: string;
  note: string | null;
  created_at: number;
  updated_at: number;
};

export type UpsertBarTagInput = {
  barId: number;
  tagKey: string;
  note?: string | null;
};

export type UpsertContextTagInput = {
  barId: number;
  tagKey: string;
  note?: string | null;
};

function database(db?: Database) {
  return db ?? getDb();
}

function unixNow() {
  return Math.floor(Date.now() / 1000);
}

// M3: Get all bar tags for a session, including tag labels from dictionary
export function listBarTagsForSession(sessionId: number, db?: Database) {
  return database(db)
    .prepare(
      `
      SELECT
        bar_tags.id,
        bar_tags.bar_id,
        bars.bar_number,
        bar_tags.tag_key,
        label_dictionary.label as tag_label,
        bar_tags.note,
        bar_tags.created_at,
        bar_tags.updated_at
      FROM bar_tags
      INNER JOIN bars ON bars.id = bar_tags.bar_id
      INNER JOIN label_dictionary
        ON label_dictionary.category = 'bar'
        AND label_dictionary.key = bar_tags.tag_key
      WHERE bars.session_id = ?
      ORDER BY bars.bar_number ASC, bar_tags.tag_key ASC
    `,
    )
    .all(sessionId) as BarTagRecord[];
}

// M3: Upsert a bar tag
export function upsertBarTag(input: UpsertBarTagInput, db?: Database) {
  const now = unixNow();

  database(db)
    .prepare(
      `
      INSERT INTO bar_tags (
        bar_id,
        tag_key,
        note,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (bar_id, tag_key) DO UPDATE SET
        note = excluded.note,
        updated_at = excluded.updated_at
    `,
    )
    .run(input.barId, input.tagKey, input.note ?? null, now, now);
}

// M3: Delete a bar tag
export function deleteBarTag(barId: number, tagKey: string, db?: Database) {
  database(db)
    .prepare("DELETE FROM bar_tags WHERE bar_id = ? AND tag_key = ?")
    .run(barId, tagKey);
}

export function listContextTagsForSession(sessionId: number, db?: Database) {
  return database(db)
    .prepare(
      `
      SELECT
        context_tags.id,
        context_tags.bar_id,
        bars.bar_number,
        context_tags.tag_key,
        label_dictionary.label as tag_label,
        context_tags.note,
        context_tags.created_at,
        context_tags.updated_at
      FROM context_tags
      INNER JOIN bars ON bars.id = context_tags.bar_id
      INNER JOIN label_dictionary
        ON label_dictionary.category = 'context'
        AND label_dictionary.key = context_tags.tag_key
      WHERE bars.session_id = ?
      ORDER BY bars.bar_number ASC, context_tags.tag_key ASC
    `,
    )
    .all(sessionId) as ContextTagRecord[];
}

export function upsertContextTag(input: UpsertContextTagInput, db?: Database) {
  const now = unixNow();

  database(db)
    .prepare(
      `
      INSERT INTO context_tags (
        bar_id,
        tag_key,
        note,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (bar_id, tag_key) DO UPDATE SET
        note = excluded.note,
        updated_at = excluded.updated_at
    `,
    )
    .run(input.barId, input.tagKey, input.note ?? null, now, now);
}

export function deleteContextTag(barId: number, tagKey: string, db?: Database) {
  database(db)
    .prepare("DELETE FROM context_tags WHERE bar_id = ? AND tag_key = ?")
    .run(barId, tagKey);
}

// Deprecated: Old bar_labels functions (kept for reference during M3 transition)
export type BarLabelRecord = {
  id: number;
  bar_id: number;
  field: string;
  value: string;
  note: string | null;
  created_at: number;
  updated_at: number;
};

export type UpsertBarLabelInput = {
  barId: number;
  field: string;
  value: string;
  note?: string | null;
};

// Deprecated: Use listBarTagsForSession instead
export function listBarLabelsForSession(sessionId: number, db?: Database) {
  // Return empty array since bar_labels table no longer exists
  void sessionId;
  void db;
  return [] as BarLabelRecord[];
}

// Deprecated: Use upsertBarTag instead
export function upsertBarLabel(input: UpsertBarLabelInput, db?: Database) {
  // No-op, bar_labels table no longer exists
  void input;
  void db;
}

// Deprecated: Use deleteBarTag instead
export function deleteBarLabel(barId: number, field: string, db?: Database) {
  // No-op, bar_labels table no longer exists
  void barId;
  void field;
  void db;
}
