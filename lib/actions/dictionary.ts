"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { ensureDatabase } from "@/lib/db/ensure";
import {
  parseFieldMappingJson,
  renameDictionaryKey,
  setDictionaryItemActive,
  upsertDictionaryItem,
} from "@/lib/repo/dictionary";

const categorySchema = z.enum(["bar", "segment", "context", "outcome"]);
const sourceSchema = z.enum([
  "manual",
  "auto_numeric",
  "nlp",
  "imported_albrooks",
  "model_suggested",
]);

const tagKeySchema = z
  .string()
  .trim()
  .min(1)
  .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, and underscores.");

const tagFormSchema = z.object({
  category: categorySchema,
  key: tagKeySchema,
  groupName: z.string().trim().min(1),
  label: z.string().trim().min(1),
  description: z.string().trim().optional(),
  example: z.string().trim().optional(),
  fieldMappingJson: z.string().trim().optional(),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(false),
  source: sourceSchema.default("manual"),
});

const activeFormSchema = z.object({
  category: categorySchema,
  key: tagKeySchema,
  isActive: z.enum(["0", "1"]),
});

const renameFormSchema = z.object({
  category: categorySchema,
  oldKey: tagKeySchema,
  newKey: tagKeySchema,
});

function cleanJson(value: string | undefined) {
  const json = value?.trim() || "{}";
  parseFieldMappingJson(json);
  return json;
}

export async function saveDictionaryItem(formData: FormData) {
  ensureDatabase();

  const input = tagFormSchema.parse({
    category: formData.get("category"),
    key: formData.get("key"),
    groupName: formData.get("groupName"),
    label: formData.get("label"),
    description: formData.get("description"),
    example: formData.get("example"),
    fieldMappingJson: formData.get("fieldMappingJson"),
    sortOrder: formData.get("sortOrder"),
    isActive: formData.get("isActive") === "on",
    source: formData.get("source") || "manual",
  });

  upsertDictionaryItem({
    ...input,
    description: input.description || null,
    example: input.example || null,
    fieldMappingJson: cleanJson(input.fieldMappingJson),
  });

  revalidatePath("/tags");
  revalidatePath(`/tags/${input.key}`);
  redirect(`/tags/${input.key}?category=${input.category}`);
}

export async function setDictionaryItemActiveFromForm(formData: FormData) {
  ensureDatabase();

  const input = activeFormSchema.parse({
    category: formData.get("category"),
    key: formData.get("key"),
    isActive: formData.get("isActive"),
  });

  setDictionaryItemActive(input.category, input.key, input.isActive === "1");

  revalidatePath("/tags");
  revalidatePath(`/tags/${input.key}`);
}

export async function renameDictionaryKeyFromForm(formData: FormData) {
  ensureDatabase();

  const input = renameFormSchema.parse({
    category: formData.get("category"),
    oldKey: formData.get("oldKey"),
    newKey: formData.get("newKey"),
  });

  if (input.oldKey !== input.newKey) {
    renameDictionaryKey(input.category, input.oldKey, input.newKey);
  }

  revalidatePath("/tags");
  revalidatePath(`/tags/${input.oldKey}`);
  revalidatePath(`/tags/${input.newKey}`);
  redirect(`/tags/${input.newKey}?category=${input.category}`);
}
