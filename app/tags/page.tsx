import Link from "next/link";
import { connection } from "next/server";

import { TagSelectionPanel } from "@/components/tag-selection/TagSelectionPanel";
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

  const newTagHref = category ? `/tags/new?category=${category}` : "/tags/new";
  const dashboardHref = category
    ? `/tags/dashboard?category=${category}`
    : "/tags/dashboard";

  return (
    <main className="flex flex-1 justify-center px-6 py-8">
      <section className="w-full max-w-7xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-100">
              Tags
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Dictionary entries, mapping, source, status, and usage.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={dashboardHref}
              className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Dashboard
            </Link>
            <Link
              href={newTagHref}
              className="rounded bg-zinc-950 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-950"
            >
              New tag
            </Link>
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

        <TagSelectionPanel items={items} />
      </section>
    </main>
  );
}
