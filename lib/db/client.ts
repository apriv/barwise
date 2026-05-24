import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "barwise.db");

type GlobalWithDb = typeof globalThis & {
  __barwiseDb?: Database.Database;
};

function openDatabase() {
  mkdirSync(DATA_DIR, { recursive: true });

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");

  return db;
}

export function getDb() {
  const globalForDb = globalThis as GlobalWithDb;
  globalForDb.__barwiseDb ??= openDatabase();
  return globalForDb.__barwiseDb;
}

export { DB_PATH };
