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
  deleteDictionaryItem,
  countTagUsage,
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
  originalCategory: categorySchema.optional(),
  originalKey: tagKeySchema.optional(),
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
    originalCategory: formData.get("originalCategory") || undefined,
    originalKey: formData.get("originalKey") || undefined,
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
  const category = input.originalCategory ?? input.category;
  const key = input.originalKey ?? input.key;

  upsertDictionaryItem({
    ...input,
    category,
    key,
    description: input.description || null,
    example: input.example || null,
    fieldMappingJson: cleanJson(input.fieldMappingJson),
  });

  revalidatePath("/tags");
  revalidatePath("/tags/dashboard");
  revalidatePath(`/tags/${key}`);
  redirect(`/tags/${key}?category=${category}`);
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
  revalidatePath("/tags/dashboard");
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
  revalidatePath("/tags/dashboard");
  revalidatePath(`/tags/${input.oldKey}`);
  revalidatePath(`/tags/${input.newKey}`);
  redirect(`/tags/${input.newKey}?category=${input.category}`);
}

const batchOperationSchema = z.object({
  action: z.enum(["enable", "disable", "delete"]),
  items: z.array(
    z.object({
      category: categorySchema,
      key: tagKeySchema,
    }),
  ),
});

export async function batchDictionaryOperation(formData: FormData) {
  ensureDatabase();

  const actionStr = formData.get("action");
  const itemsStr = formData.get("items");

  const input = batchOperationSchema.parse({
    action: actionStr,
    items: itemsStr ? JSON.parse(itemsStr as string) : [],
  });

  for (const item of input.items) {
    if (input.action === "enable") {
      setDictionaryItemActive(item.category, item.key, true);
    } else if (input.action === "disable") {
      setDictionaryItemActive(item.category, item.key, false);
    } else if (input.action === "delete") {
      deleteDictionaryItem(item.category, item.key);
    }
  }

  revalidatePath("/tags");
  revalidatePath("/tags/dashboard");
}

export async function getTagsUsageForBatchDelete(
  items: Array<{ category: string; key: string }>,
): Promise<{ [key: string]: number }> {
  ensureDatabase();

  const usage: { [key: string]: number } = {};
  for (const item of items) {
    const category = categorySchema.parse(item.category);
    const count = countTagUsage(category, item.key);
    usage[`${item.category}:${item.key}`] = count;
  }

  return usage;
}
