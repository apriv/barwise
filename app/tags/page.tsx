import Link from "next/link";
import { connection } from "next/server";

import {
  saveDictionaryItem,
  setDictionaryItemActiveFromForm,
} from "@/lib/actions/dictionary";
import { ensureDatabase } from "@/lib/db/ensure";
import type { LabelCategory, LabelSource } from "@/lib/repo/dictionary";
import { listDictionaryItemsWithUsage } from "@/lib/repo/dictionary";

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

function statusClass(isActive: number) {
  return isActive
    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/80 dark:bg-emerald-950/40 dark:text-emerald-300"
    : "border-zinc-200 bg-zinc-100 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500";
}

export default async function TagsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await connection();
  ensureDatabase();

  const query = await searchParams;
  const selectedCategory = single(query.category) as LabelCategory | undefined;
  const selectedStatus = single(query.status) ?? "active";
  const selectedSource = single(query.source);
  const q = (single(query.q) ?? "").toLowerCase().trim();

  const category =
    selectedCategory && categories.includes(selectedCategory)
      ? selectedCategory
      : undefined;
  const source =
    selectedSource && sources.includes(selectedSource as LabelSource)
      ? selectedSource
      : "";

  const items = listDictionaryItemsWithUsage(category).filter((item) => {
    if (selectedStatus === "active" && !item.is_active) return false;
    if (selectedStatus === "inactive" && item.is_active) return false;
    if (source && item.source !== source) return false;
    if (!q) return true;

    const haystack = [
      item.key,
      item.label,
      item.group_name,
      item.description ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });

  return (
    <main className="flex flex-1 justify-center px-6 py-8">
      <section className="w-full max-w-7xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-100">
              Tags
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Dictionary, mapping, source, status, and usage.
            </p>
          </div>
        </div>

        <form className="grid gap-3 rounded border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-950/60 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_auto]">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search"
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-800 dark:bg-zinc-950"
          />
          <select
            name="category"
            defaultValue={category ?? ""}
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          >
            <option value="">All categories</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {categoryLabel(item)}
              </option>
            ))}
          </select>
          <select
            name="status"
            defaultValue={selectedStatus}
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All statuses</option>
          </select>
          <select
            name="source"
            defaultValue={source}
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          >
            <option value="">All sources</option>
            {sources.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <button className="rounded bg-zinc-950 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-950">
            Apply
          </button>
        </form>

        <details className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
          <summary className="cursor-pointer text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            New tag
          </summary>
          <form action={saveDictionaryItem} className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-xs font-medium uppercase text-zinc-500">Key</span>
              <input
                required
                name="key"
                placeholder="strong_bull_close"
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs font-medium uppercase text-zinc-500">Display name</span>
              <input
                required
                name="label"
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs font-medium uppercase text-zinc-500">Category</span>
              <select
                name="category"
                defaultValue={category ?? "bar"}
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
              <span className="text-xs font-medium uppercase text-zinc-500">Group</span>
              <input
                required
                name="groupName"
                defaultValue={category === "outcome" ? "outcome_result" : ""}
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950"
              />
            </label>
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="text-xs font-medium uppercase text-zinc-500">Description</span>
              <textarea
                name="description"
                rows={2}
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950"
              />
            </label>
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="text-xs font-medium uppercase text-zinc-500">Field mapping JSON</span>
              <textarea
                name="fieldMappingJson"
                rows={4}
                defaultValue={"{}"}
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 font-mono text-xs dark:border-zinc-800 dark:bg-zinc-950"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs font-medium uppercase text-zinc-500">Source</span>
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
              <span className="text-xs font-medium uppercase text-zinc-500">Sort order</span>
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
        </details>

        <div className="overflow-hidden rounded border border-zinc-200 dark:border-zinc-800">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-zinc-100 text-xs uppercase text-zinc-500 dark:bg-zinc-900 dark:text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Tag</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Group</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 text-right font-medium">Usage</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {items.map((item) => (
                <tr key={`${item.category}:${item.key}`} className="hover:bg-zinc-100/70 dark:hover:bg-zinc-900/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/tags/${item.key}?category=${item.category}`}
                      className="font-medium text-zinc-950 hover:text-zinc-700 dark:text-zinc-100 dark:hover:text-white"
                    >
                      {item.label}
                    </Link>
                    <div className="font-mono text-xs text-zinc-500">{item.key}</div>
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                    {item.category}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                    {item.group_name}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                    {item.source}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-700 dark:text-zinc-300">
                    {item.usage_count}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded border px-2 py-1 text-xs ${statusClass(item.is_active)}`}>
                      {item.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={setDictionaryItemActiveFromForm}>
                      <input type="hidden" name="category" value={item.category} />
                      <input type="hidden" name="key" value={item.key} />
                      <input type="hidden" name="isActive" value={item.is_active ? "0" : "1"} />
                      <button className="rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900">
                        {item.is_active ? "Disable" : "Restore"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-zinc-500">
                    No tags match the current filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
