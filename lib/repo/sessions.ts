import type { Database } from "better-sqlite3";

import { getDb } from "@/lib/db/client";
import type { BuiltSession, SessionType } from "@/lib/import/session-build";

export type InstrumentRecord = {
  id: number;
  symbol: string;
  description: string | null;
  tick_size: number;
  tick_value: number | null;
  timezone: string;
};

export type SessionRecord = {
  id: number;
  instrument_id: number;
  session_date: string;
  session_type: SessionType;
  start_ts: number;
  end_ts: number;
  bar_count: number;
  imported_at: number;
  source_file: string | null;
};

type UpsertSessionInput = BuiltSession & {
  instrumentId: number;
  sourceFile?: string | null;
};

function database(db?: Database) {
  return db ?? getDb();
}

function unixNow() {
  return Math.floor(Date.now() / 1000);
}

export function getInstrumentBySymbol(symbol: string, db?: Database) {
  return database(db)
    .prepare(
      `
      SELECT id, symbol, description, tick_size, tick_value, timezone
      FROM instruments
      WHERE symbol = ?
    `,
    )
    .get(symbol) as InstrumentRecord | undefined;
}

export function listSessions(db?: Database) {
  return database(db)
    .prepare(
      `
      SELECT
        sessions.id,
        sessions.instrument_id,
        sessions.session_date,
        sessions.session_type,
        sessions.start_ts,
        sessions.end_ts,
        sessions.bar_count,
        sessions.imported_at,
        sessions.source_file
      FROM sessions
      ORDER BY sessions.session_date DESC, sessions.session_type ASC
    `,
    )
    .all() as SessionRecord[];
}

export function getSession(id: number, db?: Database) {
  return database(db)
    .prepare(
      `
      SELECT
        id,
        instrument_id,
        session_date,
        session_type,
        start_ts,
        end_ts,
        bar_count,
        imported_at,
        source_file
      FROM sessions
      WHERE id = ?
    `,
    )
    .get(id) as SessionRecord | undefined;
}

export function upsertSession(input: UpsertSessionInput, db?: Database) {
  const conn = database(db);
  const now = unixNow();

  conn
    .prepare(
      `
      INSERT INTO sessions (
        instrument_id,
        session_date,
        session_type,
        start_ts,
        end_ts,
        bar_count,
        imported_at,
        source_file
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (instrument_id, session_date, session_type) DO UPDATE SET
        start_ts = MIN(sessions.start_ts, excluded.start_ts),
        end_ts = MAX(sessions.end_ts, excluded.end_ts),
        bar_count = MAX(sessions.bar_count, excluded.bar_count),
        source_file = COALESCE(sessions.source_file, excluded.source_file)
    `,
    )
    .run(
      input.instrumentId,
      input.sessionDate,
      input.sessionType,
      input.startTs,
      input.endTs,
      input.barCount,
      now,
      input.sourceFile ?? null,
    );

  const session = conn
    .prepare(
      `
      SELECT
        id,
        instrument_id,
        session_date,
        session_type,
        start_ts,
        end_ts,
        bar_count,
        imported_at,
        source_file
      FROM sessions
      WHERE instrument_id = ?
        AND session_date = ?
        AND session_type = ?
    `,
    )
    .get(input.instrumentId, input.sessionDate, input.sessionType) as
    | SessionRecord
    | undefined;

  if (!session) {
    throw new Error("Failed to upsert session");
  }

  return session;
}
