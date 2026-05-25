import Link from "next/link";
import { connection } from "next/server";

import { ensureDatabase } from "@/lib/db/ensure";
import type {
  DictionarySuggestion,
  LabelCategory,
} from "@/lib/repo/dictionary";
import { getDictionaryStats } from "@/lib/repo/dictionary";

const categories: LabelCategory[] = ["bar", "segment", "context", "outcome"];

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function categoryLabel(category: LabelCategory) {
  return category[0].toUpperCase() + category.slice(1);
}

function suggestionLabel(kind: DictionarySuggestion["kind"]) {
  const labels = {
    too_common: "Too common",
    rarely_used: "Rarely used",
    duplicate_mapping: "Duplicate mapping",
    inactive_referenced: "Inactive referenced",
    group_too_large: "Group too large",
  } satisfies Record<DictionarySuggestion["kind"], string>;

  return labels[kind];
}

export default async function TagsDashboardPage({
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
      : undefined;

  const stats = getDictionaryStats(category);
  const topGroups = stats.group_stats
    .toSorted(
      (a, b) =>
        b.usage_count - a.usage_count || b.active_count - a.active_count,
    )
    .slice(0, 10);
  const suggestions = stats.suggestions.slice(0, 20);

  return (
    <main className="flex flex-1 justify-center px-6 py-8">
      <section className="w-full max-w-7xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link
              href="/tags"
              className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Tags
            </Link>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-100">
              Tag dashboard
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Suggestions and group-level usage for cleaning up the dictionary.
            </p>
          </div>
          <Link
            href={category ? `/tags/new?category=${category}` : "/tags/new"}
            className="rounded bg-zinc-950 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-950"
          >
            New tag
          </Link>
        </div>

        <form className="flex flex-wrap items-end gap-3 rounded border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-950/60">
          <label className="min-w-64 space-y-1">
            <span className="text-xs font-medium uppercase text-zinc-500">
              Category
            </span>
            <select
              name="category"
              defaultValue={category ?? ""}
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <option value="">All categories</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {categoryLabel(item)}
                </option>
              ))}
            </select>
          </label>
          <button className="rounded bg-zinc-950 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-950">
            Apply
          </button>
        </form>

        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="text-xs uppercase text-zinc-500">Tags</div>
            <div className="mt-1 font-mono text-lg text-zinc-950 dark:text-zinc-100">
              {stats.tag_count}
            </div>
          </div>
          <div className="rounded border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="text-xs uppercase text-zinc-500">Active</div>
            <div className="mt-1 font-mono text-lg text-zinc-950 dark:text-zinc-100">
              {stats.active_count}
            </div>
          </div>
          <div className="rounded border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="text-xs uppercase text-zinc-500">Inactive</div>
            <div className="mt-1 font-mono text-lg text-zinc-950 dark:text-zinc-100">
              {stats.inactive_count}
            </div>
          </div>
          <div className="rounded border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="text-xs uppercase text-zinc-500">Usage</div>
            <div className="mt-1 font-mono text-lg text-zinc-950 dark:text-zinc-100">
              {stats.usage_count}
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
          <section className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
                Suggestions
              </h2>
              <span className="font-mono text-xs text-zinc-500">
                {stats.suggestions.length}
              </span>
            </div>
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {suggestions.map((suggestion, index) => (
                <div
                  key={`${suggestion.kind}:${suggestion.key ?? suggestion.group_name}:${index}`}
                  className="py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                      {suggestionLabel(suggestion.kind)}
                    </span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {suggestion.label}
                    </span>
                    <span className="font-mono text-xs text-zinc-500">
                      {suggestion.category}/{suggestion.group_name}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {suggestion.detail}
                  </p>
                  {suggestion.related_keys ? (
                    <p className="mt-1 font-mono text-xs text-zinc-500">
                      {suggestion.related_keys.join(", ")}
                    </p>
                  ) : null}
                </div>
              ))}
              {suggestions.length === 0 ? (
                <div className="py-5 text-sm text-zinc-500">
                  No cleanup suggestions for the current filter.
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
            <h2 className="mb-3 text-sm font-semibold text-zinc-950 dark:text-zinc-100">
              Top groups
            </h2>
            <div className="space-y-3">
              {topGroups.map((group) => (
                <div key={`${group.category}:${group.group_name}`}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                      {group.category}/{group.group_name}
                    </span>
                    <span className="font-mono text-xs text-zinc-500">
                      {group.usage_count}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-900">
                    <div
                      className="h-full bg-emerald-500"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(
                            4,
                            (group.usage_count /
                              Math.max(1, stats.usage_count)) *
                              100,
                          ),
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {group.active_count} active / {group.tag_count} total
                  </div>
                </div>
              ))}
              {topGroups.length === 0 ? (
                <div className="text-sm text-zinc-500">No groups yet.</div>
              ) : null}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
