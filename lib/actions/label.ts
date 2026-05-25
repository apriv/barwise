"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ensureDatabase } from "@/lib/db/ensure";
import { getDb } from "@/lib/db/client";
import {
  deleteBarTag as deleteBarTagRecord,
  deleteContextTag as deleteContextTagRecord,
  deleteOutcomeTag as deleteOutcomeTagRecord,
  deleteSegmentTag as deleteSegmentTagRecord,
  upsertBarTag as upsertBarTagRecord,
  upsertContextTag as upsertContextTagRecord,
  upsertOutcomeTag as upsertOutcomeTagRecord,
  upsertSegmentTag as upsertSegmentTagRecord,
} from "@/lib/repo/labels";

const tagActionSchema = z.object({
  sessionId: z.coerce.number().int().positive(),
  barId: z.coerce.number().int().positive(),
  tagKey: z.string().min(1),
});

const segmentTagActionSchema = z.object({
  sessionId: z.coerce.number().int().positive(),
  startBarId: z.coerce.number().int().positive(),
  endBarId: z.coerce.number().int().positive(),
  tagKey: z.string().min(1),
});

const outcomeTagActionSchema = segmentTagActionSchema.extend({
  confirmBarId: z.coerce.number().int().positive().optional(),
});

function assertValidTag(
  category: "bar" | "context" | "segment" | "outcome",
  tagKey: string,
) {
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

export async function upsertSegmentTag(formData: FormData) {
  ensureDatabase();

  const input = segmentTagActionSchema.parse({
    sessionId: formData.get("sessionId"),
    startBarId: formData.get("startBarId"),
    endBarId: formData.get("endBarId"),
    tagKey: formData.get("tagKey"),
  });

  assertValidTag("segment", input.tagKey);

  upsertSegmentTagRecord({
    sessionId: input.sessionId,
    startBarId: input.startBarId,
    endBarId: input.endBarId,
    tagKey: input.tagKey,
  });

  revalidatePath(`/sessions/${input.sessionId}`);
}

export async function deleteSegmentTag(formData: FormData) {
  ensureDatabase();

  const input = segmentTagActionSchema.parse({
    sessionId: formData.get("sessionId"),
    startBarId: formData.get("startBarId"),
    endBarId: formData.get("endBarId"),
    tagKey: formData.get("tagKey"),
  });

  deleteSegmentTagRecord(input.startBarId, input.endBarId, input.tagKey);
  revalidatePath(`/sessions/${input.sessionId}`);
}

export async function upsertOutcomeTag(formData: FormData) {
  ensureDatabase();

  const input = outcomeTagActionSchema.parse({
    sessionId: formData.get("sessionId"),
    startBarId: formData.get("startBarId"),
    endBarId: formData.get("endBarId"),
    confirmBarId: formData.get("confirmBarId") || undefined,
    tagKey: formData.get("tagKey"),
  });

  assertValidTag("outcome", input.tagKey);

  upsertOutcomeTagRecord({
    sessionId: input.sessionId,
    startBarId: input.startBarId,
    endBarId: input.endBarId,
    confirmBarId: input.confirmBarId ?? null,
    tagKey: input.tagKey,
    source: "manual",
  });

  revalidatePath(`/sessions/${input.sessionId}`);
}

export async function deleteOutcomeTag(formData: FormData) {
  ensureDatabase();

  const input = segmentTagActionSchema.parse({
    sessionId: formData.get("sessionId"),
    startBarId: formData.get("startBarId"),
    endBarId: formData.get("endBarId"),
    tagKey: formData.get("tagKey"),
  });

  deleteOutcomeTagRecord(input.startBarId, input.endBarId, input.tagKey);
  revalidatePath(`/sessions/${input.sessionId}`);
}

const clearAllTagsSchema = z.object({
  sessionId: z.coerce.number().int().positive(),
});

export async function clearAllSessionTags(formData: FormData) {
  ensureDatabase();

  const input = clearAllTagsSchema.parse({
    sessionId: formData.get("sessionId"),
  });

  const db = getDb();

  db.transaction(() => {
    // Clear bar tags
    db.prepare(
      `
      DELETE FROM bar_tags
      WHERE bar_id IN (
        SELECT id FROM bars WHERE session_id = ?
      )
    `,
    ).run(input.sessionId);

    // Clear context tags
    db.prepare(
      `
      DELETE FROM context_tags
      WHERE bar_id IN (
        SELECT id FROM bars WHERE session_id = ?
      )
    `,
    ).run(input.sessionId);

    // Clear segment tags
    db.prepare(
      `
      DELETE FROM segment_tags
      WHERE session_id = ?
    `,
    ).run(input.sessionId);

    // Clear outcome tags
    const outcomeTableExists = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'outcome_tags'",
      )
      .get();
    if (outcomeTableExists) {
      db.prepare(
        `
        DELETE FROM outcome_tags
        WHERE session_id = ?
      `,
      ).run(input.sessionId);
    }
  })();

  revalidatePath(`/sessions/${input.sessionId}`);
}
