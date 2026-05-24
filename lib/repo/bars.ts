import type { Database } from "better-sqlite3";

import { getDb } from "@/lib/db/client";
import type { SessionBar } from "@/lib/import/session-build";

export type BarRecord = {
  id: number;
  session_id: number;
  bar_number: number;
  ts: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
};

function database(db?: Database) {
  return db ?? getDb();
}

export function listBarsForSession(sessionId: number, db?: Database) {
  return database(db)
    .prepare(
      `
      SELECT id, session_id, bar_number, ts, open, high, low, close, volume
      FROM bars
      WHERE session_id = ?
      ORDER BY bar_number
    `,
    )
    .all(sessionId) as BarRecord[];
}

export function insertBarsSkippingExisting(
  sessionId: number,
  bars: SessionBar[],
  db?: Database,
) {
  const conn = database(db);
  const insert = conn.prepare(`
    INSERT OR IGNORE INTO bars (
      session_id,
      bar_number,
      ts,
      open,
      high,
      low,
      close,
      volume
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let inserted = 0;
  let skipped = 0;

  for (const bar of bars) {
    const result = insert.run(
      sessionId,
      bar.barNumber,
      bar.ts,
      bar.open,
      bar.high,
      bar.low,
      bar.close,
      bar.volume,
    );

    if (result.changes > 0) {
      inserted += 1;
    } else {
      skipped += 1;
    }
  }

  return { inserted, skipped };
}
