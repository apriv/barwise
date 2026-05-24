"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ensureDatabase } from "@/lib/db/ensure";
import { getDb } from "@/lib/db/client";
import { parseCsvBars } from "@/lib/import/csv-parse";
import {
  buildSessions,
  type SessionType,
} from "@/lib/import/session-build";
import { insertBarsSkippingExisting } from "@/lib/repo/bars";
import {
  getInstrumentBySymbol,
  upsertSession,
} from "@/lib/repo/sessions";

type ImportSummary = {
  sessionCount: number;
  insertedBars: number;
  skippedBars: number;
  warnings: string[];
};

type ImportCsvInput = {
  csv: string;
  fileName: string;
  instrumentSymbol?: string;
  sourceTimezone?: string;
  sessionType?: SessionType;
};

const importCsvInputSchema = z.object({
  csv: z.string().min(1),
  fileName: z.string().min(1),
  instrumentSymbol: z.string().min(1).default("ES"),
  sourceTimezone: z.string().min(1).default("America/Chicago"),
  sessionType: z.enum(["RTH", "ETH"]).default("RTH"),
});

const importFormSchema = z.object({
  sourceTimezone: z.string().min(1).default("America/Chicago"),
  sessionType: z.enum(["RTH", "ETH"]).default("RTH"),
  instrumentSymbol: z.string().min(1).default("ES"),
});

function safeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

function importBackupPath(fileName: string) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(
    process.cwd(),
    "data",
    "imports",
    `${stamp}__${safeFileName(fileName)}`,
  );
}

async function backupCsv(csv: string, fileName: string) {
  const backupPath = importBackupPath(fileName);
  await mkdir(path.dirname(backupPath), { recursive: true });
  await writeFile(backupPath, csv, "utf8");
  return backupPath;
}

export async function importCsvText(
  input: ImportCsvInput,
): Promise<ImportSummary> {
  ensureDatabase();

  const options = importCsvInputSchema.parse(input);
  const parsed = parseCsvBars(options.csv, {
    sourceTimezone: options.sourceTimezone,
  });
  const built = buildSessions(parsed.bars, {
    sessionType: options.sessionType,
  });

  if (built.sessions.length === 0) {
    throw new Error("No bars matched the selected session hours.");
  }

  await backupCsv(options.csv, options.fileName);

  const db = getDb();
  const summary = db.transaction(() => {
    const instrument = getInstrumentBySymbol(options.instrumentSymbol, db);
    if (!instrument) {
      throw new Error(`Instrument not found: ${options.instrumentSymbol}`);
    }

    let insertedBars = 0;
    let skippedBars = 0;

    for (const session of built.sessions) {
      const savedSession = upsertSession(
        {
          ...session,
          instrumentId: instrument.id,
          sourceFile: options.fileName,
        },
        db,
      );
      const result = insertBarsSkippingExisting(
        savedSession.id,
        session.bars,
        db,
      );

      insertedBars += result.inserted;
      skippedBars += result.skipped;
    }

    return {
      sessionCount: built.sessions.length,
      insertedBars,
      skippedBars,
      warnings: [
        ...parsed.warnings.map((warning) => warning.message),
        ...built.warnings.map((warning) => warning.message),
      ],
    };
  })();

  revalidatePath("/sessions");
  return summary;
}

export async function importCsvAction(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("CSV file is required.");
  }

  const options = importFormSchema.parse({
    sourceTimezone: formData.get("sourceTimezone") ?? undefined,
    sessionType: formData.get("sessionType") ?? undefined,
    instrumentSymbol: formData.get("instrumentSymbol") ?? undefined,
  });

  return importCsvText({
    csv: await file.text(),
    fileName: file.name,
    ...options,
  });
}
