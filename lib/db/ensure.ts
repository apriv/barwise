import { readFileSync } from "node:fs";
import path from "node:path";

import { getDb } from "@/lib/db/client";
import seedDictionary from "@/lib/db/seed-dictionary";

let didEnsure = false;

const SCHEMA_PATH = path.join(process.cwd(), "lib", "db", "schema.sql");

export function ensureDatabase() {
  if (didEnsure) {
    return;
  }

  getDb().exec(readFileSync(SCHEMA_PATH, "utf8"));
  seedDictionary();
  didEnsure = true;
}
