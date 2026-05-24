import { migrate } from "@/lib/db/migrate";
import { seedDictionary } from "@/lib/db/seed-dictionary";

let didEnsure = false;

export function ensureDatabase() {
  if (didEnsure) {
    return;
  }

  migrate();
  seedDictionary();
  didEnsure = true;
}
