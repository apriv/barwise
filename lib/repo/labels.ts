import type { Database } from "better-sqlite3";

import { getDb } from "@/lib/db/client";

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

function database(db?: Database) {
  return db ?? getDb();
}

function unixNow() {
  return Math.floor(Date.now() / 1000);
}

export function listBarLabelsForSession(sessionId: number, db?: Database) {
  return database(db)
    .prepare(
      `
      SELECT
        bar_labels.id,
        bar_labels.bar_id,
        bar_labels.field,
        bar_labels.value,
        bar_labels.note,
        bar_labels.created_at,
        bar_labels.updated_at
      FROM bar_labels
      INNER JOIN bars ON bars.id = bar_labels.bar_id
      WHERE bars.session_id = ?
      ORDER BY bars.bar_number ASC, bar_labels.field ASC
    `,
    )
    .all(sessionId) as BarLabelRecord[];
}

export function upsertBarLabel(input: UpsertBarLabelInput, db?: Database) {
  const now = unixNow();

  database(db)
    .prepare(
      `
      INSERT INTO bar_labels (
        bar_id,
        field,
        value,
        note,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT (bar_id, field) DO UPDATE SET
        value = excluded.value,
        note = excluded.note,
        updated_at = excluded.updated_at
    `,
    )
    .run(input.barId, input.field, input.value, input.note ?? null, now, now);
}

export function deleteBarLabel(barId: number, field: string, db?: Database) {
  database(db)
    .prepare("DELETE FROM bar_labels WHERE bar_id = ? AND field = ?")
    .run(barId, field);
}
