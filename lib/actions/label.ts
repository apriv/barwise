"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ensureDatabase } from "@/lib/db/ensure";
import { getDb } from "@/lib/db/client";
import {
  deleteBarLabel as deleteBarLabelRecord,
  upsertBarLabel as upsertBarLabelRecord,
} from "@/lib/repo/labels";

const barLabelActionSchema = z.object({
  sessionId: z.coerce.number().int().positive(),
  barId: z.coerce.number().int().positive(),
  field: z.enum(["bar_quality", "bar_role"]),
  value: z.string().min(1),
  note: z.string().optional(),
});

const deleteBarLabelActionSchema = z.object({
  sessionId: z.coerce.number().int().positive(),
  barId: z.coerce.number().int().positive(),
  field: z.enum(["bar_quality", "bar_role"]),
});

function assertDictionaryValue(field: string, value: string) {
  const row = getDb()
    .prepare(
      `
      SELECT 1
      FROM label_dictionary
      WHERE category = 'bar'
        AND field = ?
        AND key = ?
        AND is_active = 1
    `,
    )
    .get(field, value);

  if (!row) {
    throw new Error(`Invalid bar label value: ${field}=${value}`);
  }
}

export async function upsertBarLabel(formData: FormData) {
  ensureDatabase();

  const input = barLabelActionSchema.parse({
    sessionId: formData.get("sessionId"),
    barId: formData.get("barId"),
    field: formData.get("field"),
    value: formData.get("value"),
    note: formData.get("note") ?? undefined,
  });

  assertDictionaryValue(input.field, input.value);

  upsertBarLabelRecord({
    barId: input.barId,
    field: input.field,
    value: input.value,
    note: input.note?.trim() || null,
  });

  revalidatePath(`/sessions/${input.sessionId}`);
}

export async function deleteBarLabel(formData: FormData) {
  ensureDatabase();

  const input = deleteBarLabelActionSchema.parse({
    sessionId: formData.get("sessionId"),
    barId: formData.get("barId"),
    field: formData.get("field"),
  });

  deleteBarLabelRecord(input.barId, input.field);
  revalidatePath(`/sessions/${input.sessionId}`);
}
