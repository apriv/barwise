"use client";

import { useCallback, useState, useTransition } from "react";
import { batchDictionaryOperation } from "@/lib/actions/dictionary";
import type { LabelDictionaryItemWithUsage } from "@/lib/repo/dictionary";
import type { LabelCategory } from "@/lib/repo/dictionary";

interface TagSelectionPanelProps {
  items: LabelDictionaryItemWithUsage[];
}

export function TagSelectionPanel({ items }: TagSelectionPanelProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const toggleAll = useCallback(() => {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(
        new Set(items.map((item) => `${item.category}:${item.key}`)),
      );
    }
  }, [items, selected.size]);

  const toggleItem = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleBatchAction = useCallback(
    (action: "enable" | "disable" | "delete") => {
      if (selected.size === 0) return;

      if (
        action === "delete" &&
        !confirm(
          `Are you sure you want to delete ${selected.size} tag(s)? This action cannot be undone.`,
        )
      ) {
        return;
      }

      const itemsToProcess = Array.from(selected).map((id) => {
        const [category, key] = id.split(":");
        return { category: category as LabelCategory, key };
      });

      startTransition(() => {
        const formData = new FormData();
        formData.set("action", action);
        formData.set("items", JSON.stringify(itemsToProcess));
        batchDictionaryOperation(formData);
      });
    },
    [selected],
  );

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <input
          type="checkbox"
          id="select-all"
          checked={selected.size === items.length && items.length > 0}
          onChange={toggleAll}
          disabled={items.length === 0}
          className="cursor-pointer"
        />
        <label htmlFor="select-all" className="text-sm font-medium">
          Select All ({selected.size}/{items.length})
        </label>

        {selected.size > 0 && (
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => handleBatchAction("enable")}
              disabled={isPending}
              className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-700 dark:hover:bg-emerald-600"
            >
              Enable
            </button>
            <button
              onClick={() => handleBatchAction("disable")}
              disabled={isPending}
              className="rounded bg-yellow-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-yellow-700 disabled:opacity-50 dark:bg-yellow-700 dark:hover:bg-yellow-600"
            >
              Disable
            </button>
            <button
              onClick={() => handleBatchAction("delete")}
              disabled={isPending}
              className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 dark:bg-red-700 dark:hover:bg-red-600"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded border border-zinc-200 dark:border-zinc-800">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-zinc-100 text-xs uppercase text-zinc-500 dark:bg-zinc-900 dark:text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">
                <input
                  type="checkbox"
                  checked={selected.size === items.length && items.length > 0}
                  onChange={toggleAll}
                  className="cursor-pointer"
                />
              </th>
              <th className="px-4 py-3 font-medium">Tag</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Group</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 text-right font-medium">Usage</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {items.map((item) => {
              const id = `${item.category}:${item.key}`;
              const isChecked = selected.has(id);
              return (
                <tr
                  key={id}
                  className={`${isChecked ? "bg-blue-50 dark:bg-blue-950/30" : "hover:bg-zinc-100/70 dark:hover:bg-zinc-900/50"}`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleItem(id)}
                      className="cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`/tags/${item.key}?category=${item.category}`}
                      className="font-medium text-zinc-950 hover:text-zinc-700 dark:text-zinc-100 dark:hover:text-white"
                    >
                      {item.label}
                    </a>
                    <div className="font-mono text-xs text-zinc-500">
                      {item.key}
                    </div>
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
                    <span
                      className={`rounded border px-2 py-1 text-xs ${
                        item.is_active
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/80 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "border-zinc-200 bg-zinc-100 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500"
                      }`}
                    >
                      {item.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              );
            })}
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
    </>
  );
}
