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

export type SegmentTagRecord = {
  id: number;
  session_id: number;
  start_bar_id: number;
  start_bar_number: number;
  end_bar_id: number;
  end_bar_number: number;
  tag_key: string;
  tag_label: string;
  note: string | null;
  created_at: number;
  updated_at: number;
};

export type OutcomeTagRecord = {
  id: number;
  session_id: number;
  start_bar_id: number;
  start_bar_number: number;
  end_bar_id: number;
  end_bar_number: number;
  confirm_bar_id: number | null;
  confirm_bar_number: number | null;
  related_context_bar_id: number | null;
  tag_key: string;
  tag_label: string;
  note: string | null;
  source: string;
  created_at: number;
  updated_at: number;
};

export type UpsertBarTagInput = {
  barId: number;
  tagKey: string;
  note?: string | null;
};

export type UpsertSegmentTagInput = {
  sessionId: number;
  startBarId: number;
  endBarId: number;
  tagKey: string;
  note?: string | null;
};

export type UpsertContextTagInput = {
  barId: number;
  tagKey: string;
  note?: string | null;
};

export type UpsertOutcomeTagInput = {
  sessionId: number;
  startBarId: number;
  endBarId: number;
  confirmBarId?: number | null;
  relatedContextBarId?: number | null;
  tagKey: string;
  note?: string | null;
  source?: string;
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

export function listSegmentTagsForSession(sessionId: number, db?: Database) {
  return database(db)
    .prepare(
      `
      SELECT
        segment_tags.id,
        segment_tags.session_id,
        segment_tags.start_bar_id,
        start_bars.bar_number AS start_bar_number,
        segment_tags.end_bar_id,
        end_bars.bar_number AS end_bar_number,
        segment_tags.tag_key,
        label_dictionary.label AS tag_label,
        segment_tags.note,
        segment_tags.created_at,
        segment_tags.updated_at
      FROM segment_tags
      INNER JOIN bars AS start_bars ON start_bars.id = segment_tags.start_bar_id
      INNER JOIN bars AS end_bars ON end_bars.id = segment_tags.end_bar_id
      INNER JOIN label_dictionary
        ON label_dictionary.category = 'segment'
        AND label_dictionary.key = segment_tags.tag_key
      WHERE segment_tags.session_id = ?
      ORDER BY start_bars.bar_number ASC, end_bars.bar_number ASC, segment_tags.tag_key ASC
    `,
    )
    .all(sessionId) as SegmentTagRecord[];
}

export function upsertSegmentTag(input: UpsertSegmentTagInput, db?: Database) {
  const now = unixNow();

  database(db)
    .prepare(
      `
      INSERT INTO segment_tags (
        session_id,
        start_bar_id,
        end_bar_id,
        tag_key,
        note,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (start_bar_id, end_bar_id, tag_key) DO UPDATE SET
        note = excluded.note,
        updated_at = excluded.updated_at
    `,
    )
    .run(
      input.sessionId,
      input.startBarId,
      input.endBarId,
      input.tagKey,
      input.note ?? null,
      now,
      now,
    );
}

export function deleteSegmentTag(
  startBarId: number,
  endBarId: number,
  tagKey: string,
  db?: Database,
) {
  database(db)
    .prepare(
      "DELETE FROM segment_tags WHERE start_bar_id = ? AND end_bar_id = ? AND tag_key = ?",
    )
    .run(startBarId, endBarId, tagKey);
}

export function listOutcomeTagsForSession(sessionId: number, db?: Database) {
  return database(db)
    .prepare(
      `
      SELECT
        outcome_tags.id,
        outcome_tags.session_id,
        outcome_tags.start_bar_id,
        start_bars.bar_number AS start_bar_number,
        outcome_tags.end_bar_id,
        end_bars.bar_number AS end_bar_number,
        outcome_tags.confirm_bar_id,
        confirm_bars.bar_number AS confirm_bar_number,
        outcome_tags.related_context_bar_id,
        outcome_tags.tag_key,
        label_dictionary.label AS tag_label,
        outcome_tags.note,
        outcome_tags.source,
        outcome_tags.created_at,
        outcome_tags.updated_at
      FROM outcome_tags
      INNER JOIN bars AS start_bars ON start_bars.id = outcome_tags.start_bar_id
      INNER JOIN bars AS end_bars ON end_bars.id = outcome_tags.end_bar_id
      LEFT JOIN bars AS confirm_bars ON confirm_bars.id = outcome_tags.confirm_bar_id
      INNER JOIN label_dictionary
        ON label_dictionary.category = 'outcome'
        AND label_dictionary.key = outcome_tags.tag_key
      WHERE outcome_tags.session_id = ?
      ORDER BY start_bars.bar_number ASC, end_bars.bar_number ASC, outcome_tags.tag_key ASC
    `,
    )
    .all(sessionId) as OutcomeTagRecord[];
}

export function upsertOutcomeTag(input: UpsertOutcomeTagInput, db?: Database) {
  const now = unixNow();

  database(db)
    .prepare(
      `
      INSERT INTO outcome_tags (
        session_id,
        start_bar_id,
        end_bar_id,
        confirm_bar_id,
        related_context_bar_id,
        tag_key,
        note,
        source,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (start_bar_id, end_bar_id, tag_key) DO UPDATE SET
        confirm_bar_id = excluded.confirm_bar_id,
        related_context_bar_id = excluded.related_context_bar_id,
        note = excluded.note,
        source = excluded.source,
        updated_at = excluded.updated_at
    `,
    )
    .run(
      input.sessionId,
      input.startBarId,
      input.endBarId,
      input.confirmBarId ?? null,
      input.relatedContextBarId ?? null,
      input.tagKey,
      input.note ?? null,
      input.source ?? "manual",
      now,
      now,
    );
}

export function deleteOutcomeTag(
  startBarId: number,
  endBarId: number,
  tagKey: string,
  db?: Database,
) {
  database(db)
    .prepare(
      "DELETE FROM outcome_tags WHERE start_bar_id = ? AND end_bar_id = ? AND tag_key = ?",
    )
    .run(startBarId, endBarId, tagKey);
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
