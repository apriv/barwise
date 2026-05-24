import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { getDb } from "@/lib/db/client";

const MIGRATIONS_DIR = path.join(process.cwd(), "lib", "db", "migrations");

type CurrentVersionRow = {
  version: number | null;
};

function unixNow() {
  return Math.floor(Date.now() / 1000);
}

function parseMigrationVersion(filename: string) {
  const version = Number.parseInt(filename.split("_")[0] ?? "", 10);

  if (!Number.isInteger(version)) {
    throw new Error(`Invalid migration filename: ${filename}`);
  }

  return version;
}

export function migrate() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version     INTEGER PRIMARY KEY,
      applied_at  INTEGER NOT NULL,
      name        TEXT NOT NULL
    );
  `);

  const current =
    db
      .prepare(
        "SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations",
      )
      .get() as CurrentVersionRow;

  const currentVersion = current.version ?? 0;

  const migrations = readdirSync(MIGRATIONS_DIR)
    .filter((file) => /^\d+_.+\.sql$/.test(file))
    .sort((a, b) => parseMigrationVersion(a) - parseMigrationVersion(b));

  const applyMigration = db.transaction((filename: string) => {
    const version = parseMigrationVersion(filename);
    const sql = readFileSync(path.join(MIGRATIONS_DIR, filename), "utf8");

    db.exec(sql);
    db.prepare(
      "INSERT INTO schema_migrations (version, applied_at, name) VALUES (?, ?, ?)",
    ).run(version, unixNow(), filename);
  });

  for (const filename of migrations) {
    const version = parseMigrationVersion(filename);

    if (version > currentVersion) {
      applyMigration(filename);
    }
  }
}
