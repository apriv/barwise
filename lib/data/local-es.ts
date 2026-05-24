import { readFile } from "node:fs/promises";
import path from "node:path";

import { ensureDatabase } from "@/lib/db/ensure";
import { getDb } from "@/lib/db/client";
import { parseCsvBars } from "@/lib/import/csv-parse";
import { buildSessions } from "@/lib/import/session-build";
import { insertBarsSkippingExisting } from "@/lib/repo/bars";
import {
  getInstrumentBySymbol,
  upsertSession,
} from "@/lib/repo/sessions";

const LOCAL_ES_CSV = path.join(process.cwd(), "data", "samples", "es_5m.csv");

export async function ensureLocalEsRthData() {
  ensureDatabase();

  const csv = await readFile(LOCAL_ES_CSV, "utf8");
  const parsed = parseCsvBars(csv, {
    sourceTimezone: "America/Chicago",
  });
  const built = buildSessions(parsed.bars, {
    sessionType: "RTH",
    marketTimezone: "America/Chicago",
  });

  if (built.sessions.length === 0) {
    throw new Error("No RTH bars found in data/samples/es_5m.csv.");
  }

  const db = getDb();
  db.transaction(() => {
    const instrument = getInstrumentBySymbol("ES", db);
    if (!instrument) {
      throw new Error("Instrument not found: ES");
    }

    for (const session of built.sessions) {
      const savedSession = upsertSession(
        {
          ...session,
          instrumentId: instrument.id,
          sourceFile: "data/samples/es_5m.csv",
        },
        db,
      );

      insertBarsSkippingExisting(savedSession.id, session.bars, db);
    }
  })();
}
