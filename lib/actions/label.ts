"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ensureDatabase } from "@/lib/db/ensure";
import { getDb } from "@/lib/db/client";
import {
  deleteBarTag as deleteBarTagRecord,
  deleteContextTag as deleteContextTagRecord,
  upsertBarTag as upsertBarTagRecord,
  upsertContextTag as upsertContextTagRecord,
} from "@/lib/repo/labels";

const tagActionSchema = z.object({
  sessionId: z.coerce.number().int().positive(),
  barId: z.coerce.number().int().positive(),
  tagKey: z.string().min(1),
});

function assertValidTag(category: "bar" | "context", tagKey: string) {
  const row = getDb()
    .prepare(
      `
      SELECT 1
      FROM label_dictionary
      WHERE category = ?
        AND key = ?
        AND is_active = 1
    `,
    )
    .get(category, tagKey);

  if (!row) {
    throw new Error(`Invalid ${category} tag: ${tagKey}`);
  }
}

// M3: Upsert a bar tag
export async function upsertBarTag(formData: FormData) {
  ensureDatabase();

  const input = tagActionSchema.parse({
    sessionId: formData.get("sessionId"),
    barId: formData.get("barId"),
    tagKey: formData.get("tagKey"),
  });

  assertValidTag("bar", input.tagKey);

  upsertBarTagRecord({
    barId: input.barId,
    tagKey: input.tagKey,
  });

  revalidatePath(`/sessions/${input.sessionId}`);
}

// M3: Delete a bar tag
export async function deleteBarTag(formData: FormData) {
  ensureDatabase();

  const input = tagActionSchema.parse({
    sessionId: formData.get("sessionId"),
    barId: formData.get("barId"),
    tagKey: formData.get("tagKey"),
  });

  deleteBarTagRecord(input.barId, input.tagKey);
  revalidatePath(`/sessions/${input.sessionId}`);
}

export async function upsertContextTag(formData: FormData) {
  ensureDatabase();

  const input = tagActionSchema.parse({
    sessionId: formData.get("sessionId"),
    barId: formData.get("barId"),
    tagKey: formData.get("tagKey"),
  });

  assertValidTag("context", input.tagKey);

  upsertContextTagRecord({
    barId: input.barId,
    tagKey: input.tagKey,
  });

  revalidatePath(`/sessions/${input.sessionId}`);
}

export async function deleteContextTag(formData: FormData) {
  ensureDatabase();

  const input = tagActionSchema.parse({
    sessionId: formData.get("sessionId"),
    barId: formData.get("barId"),
    tagKey: formData.get("tagKey"),
  });

  deleteContextTagRecord(input.barId, input.tagKey);
  revalidatePath(`/sessions/${input.sessionId}`);
}
