import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import {
  renameDictionaryKeyFromForm,
  saveDictionaryItem,
  setDictionaryItemActiveFromForm,
} from "@/lib/actions/dictionary";
import { ensureDatabase } from "@/lib/db/ensure";
import type { LabelCategory, LabelSource } from "@/lib/repo/dictionary";
import {
  getDictionaryItem,
  getDictionaryItemByKey,
  listDictionaryItemsWithUsage,
} from "@/lib/repo/dictionary";

const categories: LabelCategory[] = ["bar", "segment", "context", "outcome"];
const sources: LabelSource[] = [
  "manual",
  "auto_numeric",
  "nlp",
  "imported_albrooks",
  "model_suggested",
];

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function categoryLabel(category: LabelCategory) {
  return category[0].toUpperCase() + category.slice(1);
}

function prettyJson(value: string) {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

function formatDateTime(unixSeconds: number) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(unixSeconds * 1000));
}

export default async function TagDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ tagKey: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await connection();
  ensureDatabase();

  const { tagKey } = await params;
  const query = await searchParams;
  const category = single(query.category) as LabelCategory | undefined;

  const item =
    category && categories.includes(category)
      ? getDictionaryItem(category, tagKey)
      : getDictionaryItemByKey(tagKey);

  if (!item) {
    notFound();
  }

  const usage =
    listDictionaryItemsWithUsage(item.category).find(
      (entry) => entry.category === item.category && entry.key === item.key,
    )?.usage_count ?? 0;

  return (
    <main className="flex flex-1 justify-center px-6 py-8">
      <section className="w-full max-w-5xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/tags" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
              Tags
            </Link>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-100">
              {item.label}
            </h1>
            <p className="font-mono text-sm text-zinc-500">{item.key}</p>
          </div>
          <form action={setDictionaryItemActiveFromForm}>
            <input type="hidden" name="category" value={item.category} />
            <input type="hidden" name="key" value={item.key} />
            <input type="hidden" name="isActive" value={item.is_active ? "0" : "1"} />
            <button className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900">
              {item.is_active ? "Disable" : "Restore"}
            </button>
          </form>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="text-xs uppercase text-zinc-500">Category</div>
            <div className="mt-1 font-medium">{item.category}</div>
          </div>
          <div className="rounded border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="text-xs uppercase text-zinc-500">Group</div>
            <div className="mt-1 font-mono text-sm">{item.group_name}</div>
          </div>
          <div className="rounded border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="text-xs uppercase text-zinc-500">Source</div>
            <div className="mt-1 font-mono text-sm">{item.source}</div>
          </div>
          <div className="rounded border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="text-xs uppercase text-zinc-500">Usage</div>
            <div className="mt-1 font-mono text-sm">{usage}</div>
          </div>
        </div>

        <form action={saveDictionaryItem} className="grid gap-4 rounded border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/60 md:grid-cols-2">
          <input type="hidden" name="key" value={item.key} />
          <label className="space-y-1 text-sm">
            <span className="text-xs font-medium uppercase text-zinc-500">Display name</span>
            <input
              required
              name="label"
              defaultValue={item.label}
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-medium uppercase text-zinc-500">Category</span>
            <select
              name="category"
              defaultValue={item.category}
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950"
            >
              {categories.map((entry) => (
                <option key={entry} value={entry}>
                  {categoryLabel(entry)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-medium uppercase text-zinc-500">Group</span>
            <input
              required
              name="groupName"
              defaultValue={item.group_name}
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-medium uppercase text-zinc-500">Sort order</span>
            <input
              name="sortOrder"
              type="number"
              defaultValue={item.sort_order}
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950"
            />
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="text-xs font-medium uppercase text-zinc-500">Description</span>
            <textarea
              name="description"
              rows={3}
              defaultValue={item.description ?? ""}
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950"
            />
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="text-xs font-medium uppercase text-zinc-500">Example</span>
            <textarea
              name="example"
              rows={2}
              defaultValue={item.example ?? ""}
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950"
            />
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="text-xs font-medium uppercase text-zinc-500">Field mapping JSON</span>
            <textarea
              name="fieldMappingJson"
              rows={7}
              defaultValue={prettyJson(item.field_mapping_json)}
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 font-mono text-xs dark:border-zinc-800 dark:bg-zinc-950"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-medium uppercase text-zinc-500">Source</span>
            <select
              name="source"
              defaultValue={item.source}
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950"
            >
              {sources.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input name="isActive" type="checkbox" defaultChecked={Boolean(item.is_active)} />
            Active
          </label>
          <div className="flex justify-between gap-3 md:col-span-2">
            <div className="text-xs text-zinc-500">
              Created {formatDateTime(item.created_at)} · Updated {formatDateTime(item.updated_at)}
            </div>
            <button className="rounded bg-zinc-950 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-950">
              Save changes
            </button>
          </div>
        </form>

        <details className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
          <summary className="cursor-pointer text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Rename key
          </summary>
          <form action={renameDictionaryKeyFromForm} className="mt-4 flex flex-wrap items-end gap-3">
            <input type="hidden" name="category" value={item.category} />
            <input type="hidden" name="oldKey" value={item.key} />
            <label className="min-w-72 flex-1 space-y-1 text-sm">
              <span className="text-xs font-medium uppercase text-zinc-500">New key</span>
              <input
                required
                name="newKey"
                defaultValue={item.key}
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 font-mono dark:border-zinc-800 dark:bg-zinc-950"
              />
            </label>
            <button className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900">
              Rename
            </button>
          </form>
        </details>
      </section>
    </main>
  );
}
