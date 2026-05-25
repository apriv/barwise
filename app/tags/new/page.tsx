import Link from "next/link";
import { connection } from "next/server";

import { saveDictionaryItem } from "@/lib/actions/dictionary";
import { ensureDatabase } from "@/lib/db/ensure";
import type { LabelCategory, LabelSource } from "@/lib/repo/dictionary";

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

export default async function NewTagPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await connection();
  ensureDatabase();

  const query = await searchParams;
  const selectedCategory = single(query.category) as LabelCategory | undefined;
  const category =
    selectedCategory && categories.includes(selectedCategory)
      ? selectedCategory
      : "bar";

  return (
    <main className="flex flex-1 justify-center px-6 py-8">
      <section className="w-full max-w-5xl space-y-6">
        <div>
          <Link
            href="/tags"
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Tags
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-100">
            New tag
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Create a dictionary tag with metadata and field mapping.
          </p>
        </div>

        <form
          action={saveDictionaryItem}
          className="grid gap-4 rounded border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/60 md:grid-cols-2"
        >
          <label className="space-y-1 text-sm">
            <span className="text-xs font-medium uppercase text-zinc-500">
              Key
            </span>
            <input
              required
              name="key"
              placeholder="strong_bull_close"
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 font-mono dark:border-zinc-800 dark:bg-zinc-950"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-medium uppercase text-zinc-500">
              Display name
            </span>
            <input
              required
              name="label"
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-medium uppercase text-zinc-500">
              Category
            </span>
            <select
              name="category"
              defaultValue={category}
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950"
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {categoryLabel(item)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-medium uppercase text-zinc-500">
              Group
            </span>
            <input
              required
              name="groupName"
              defaultValue={category === "outcome" ? "outcome_result" : ""}
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 font-mono dark:border-zinc-800 dark:bg-zinc-950"
            />
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="text-xs font-medium uppercase text-zinc-500">
              Description
            </span>
            <textarea
              name="description"
              rows={3}
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950"
            />
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="text-xs font-medium uppercase text-zinc-500">
              Example
            </span>
            <textarea
              name="example"
              rows={2}
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950"
            />
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="text-xs font-medium uppercase text-zinc-500">
              Field mapping JSON
            </span>
            <textarea
              name="fieldMappingJson"
              rows={7}
              defaultValue={"{}"}
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 font-mono text-xs dark:border-zinc-800 dark:bg-zinc-950"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-medium uppercase text-zinc-500">
              Source
            </span>
            <select
              name="source"
              defaultValue="manual"
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950"
            >
              {sources.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-medium uppercase text-zinc-500">
              Sort order
            </span>
            <input
              name="sortOrder"
              type="number"
              defaultValue={0}
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input name="isActive" type="checkbox" defaultChecked />
            Active
          </label>
          <div className="flex justify-end md:col-span-2">
            <button className="rounded bg-zinc-950 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-950">
              Save tag
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
