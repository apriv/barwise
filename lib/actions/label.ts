"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ensureDatabase } from "@/lib/db/ensure";
import { getDb } from "@/lib/db/client";
import {
  deleteBarTag as deleteBarTagRecord,
  upsertBarTag as upsertBarTagRecord,
} from "@/lib/repo/labels";

// M3 Tag Model - New schemas for bar_tags
const barTagActionSchema = z.object({
  sessionId: z.coerce.number().int().positive(),
  barId: z.coerce.number().int().positive(),
  tagKey: z.string().min(1),
});

const deleteBarTagActionSchema = z.object({
  sessionId: z.coerce.number().int().positive(),
  barId: z.coerce.number().int().positive(),
  tagKey: z.string().min(1),
});

function assertValidBarTag(tagKey: string) {
  const row = getDb()
    .prepare(
      `
      SELECT 1
      FROM label_dictionary
      WHERE category = 'bar'
        AND key = ?
        AND is_active = 1
    `,
    )
    .get(tagKey);

  if (!row) {
    throw new Error(`Invalid bar tag: ${tagKey}`);
  }
}

// M3: Upsert a bar tag
export async function upsertBarTag(formData: FormData) {
  ensureDatabase();

  const input = barTagActionSchema.parse({
    sessionId: formData.get("sessionId"),
    barId: formData.get("barId"),
    tagKey: formData.get("tagKey"),
  });

  assertValidBarTag(input.tagKey);

  upsertBarTagRecord({
    barId: input.barId,
    tagKey: input.tagKey,
  });

  revalidatePath(`/sessions/${input.sessionId}`);
}

// M3: Delete a bar tag
export async function deleteBarTag(formData: FormData) {
  ensureDatabase();

  const input = deleteBarTagActionSchema.parse({
    sessionId: formData.get("sessionId"),
    barId: formData.get("barId"),
    tagKey: formData.get("tagKey"),
  });

  deleteBarTagRecord(input.barId, input.tagKey);
  revalidatePath(`/sessions/${input.sessionId}`);
}
