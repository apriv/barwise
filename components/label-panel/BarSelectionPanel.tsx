"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useOptimistic, useTransition } from "react";

import type { ChartBar } from "@/components/chart/Chart";
import { deleteBarTag, upsertBarTag } from "@/lib/actions/label";
import type { LabelDictionaryItem } from "@/lib/repo/dictionary";
import type { BarTagRecord } from "@/lib/repo/labels";

type BarSelectionPanelProps = {
  bars: ChartBar[];
  tags: BarTagRecord[];
  tagOptions: LabelDictionaryItem[];
  sessionId: number;
};

function formatPrice(value: number) {
  return value.toFixed(2);
}

function groupOptions(options: LabelDictionaryItem[]) {
  return options.reduce<Record<string, LabelDictionaryItem[]>>((groups, option) => {
    groups[option.group_name] ??= [];
    groups[option.group_name].push(option);
    return groups;
  }, {});
}

const groupLabels: Record<string, string> = {
  bar_quality: "Bar Quality",
  bar_role: "Bar Role",
};

function formatGroupName(groupName: string) {
  return groupLabels[groupName] ?? groupName.replaceAll("_", " ");
}

function TagGroup({
  groupName,
  options,
  sessionId,
  barId,
  selectedTags,
}: {
  groupName: string;
  options: LabelDictionaryItem[];
  sessionId: number;
  barId: number;
  selectedTags: Set<string>;
}) {
  const [optimisticTags, toggleOptimisticTag] = useOptimistic(
    selectedTags,
    (currentTags, tagKey: string) => {
      const nextTags = new Set(currentTags);

      if (nextTags.has(tagKey)) {
        nextTags.delete(tagKey);
      } else {
        nextTags.add(tagKey);
      }

      return nextTags;
    },
  );
  const [isPending, startTransition] = useTransition();

  const selectedCount = options.filter((option) =>
    optimisticTags.has(option.key),
  ).length;

  function handleToggle(tagKey: string) {
    const isSelected = optimisticTags.has(tagKey);

    startTransition(async () => {
      toggleOptimisticTag(tagKey);

      const formData = new FormData();
      formData.set("sessionId", String(sessionId));
      formData.set("barId", String(barId));

      try {
        if (isSelected) {
          formData.set("tagKey", tagKey);
          await deleteBarTag(formData);
        } else {
          formData.set("tagKey", tagKey);
          await upsertBarTag(formData);
        }
      } catch (err) {
        console.error("Tag update failed", err);
      }
    });
  }

  return (
    <fieldset className="space-y-3 rounded border border-zinc-800 bg-zinc-950/60 p-3">
      <div className="flex items-center justify-between gap-3">
        <legend className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          {formatGroupName(groupName)}
        </legend>
        <span className="font-mono text-[11px] text-zinc-600">
          {selectedCount}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = optimisticTags.has(option.key);
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              disabled={isPending}
              onClick={() => handleToggle(option.key)}
              title={option.description ?? undefined}
              className={
                "min-h-8 rounded border px-2.5 py-1.5 text-left text-xs font-medium transition-colors disabled:cursor-wait disabled:opacity-70 " +
                (selected
                  ? "border-emerald-500/80 bg-emerald-500/15 text-emerald-100 shadow-[0_0_0_1px_rgba(52,211,153,0.18)]"
                  : "border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-900 hover:text-zinc-100")
              }
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function BarSelectionPanel({
  bars,
  tags,
  tagOptions,
  sessionId,
}: BarSelectionPanelProps) {
  const searchParams = useSearchParams();
  const selectedBarNumber = Number(searchParams.get("bar"));

  const selectedBar = useMemo(() => {
    if (!Number.isInteger(selectedBarNumber)) return null;
    return bars.find((bar) => bar.barNumber === selectedBarNumber) ?? null;
  }, [bars, selectedBarNumber]);

  const optionsByField = useMemo(
    () => groupOptions(tagOptions),
    [tagOptions],
  );

  const selectedTagsSet = useMemo(() => {
    if (!selectedBar) return new Set<string>();
    return new Set(
      tags
        .filter((tag) => tag.bar_id === selectedBar.id)
        .map((tag) => tag.tag_key),
    );
  }, [tags, selectedBar]);

  if (!selectedBar) {
    return (
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-zinc-100">Bar Tags</h2>
        <p className="text-sm text-zinc-500">Click a candle to select a bar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-sm font-medium text-zinc-100">
          Bar #{selectedBar.barNumber}
        </h2>
        <p className="text-xs text-zinc-500">Selected from chart</p>
      </div>

      <dl className="grid grid-cols-2 gap-3 font-mono text-xs">
        <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
          <dt className="text-zinc-500">Open</dt>
          <dd className="mt-1 text-zinc-100">{formatPrice(selectedBar.open)}</dd>
        </div>
        <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
          <dt className="text-zinc-500">High</dt>
          <dd className="mt-1 text-zinc-100">{formatPrice(selectedBar.high)}</dd>
        </div>
        <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
          <dt className="text-zinc-500">Low</dt>
          <dd className="mt-1 text-zinc-100">{formatPrice(selectedBar.low)}</dd>
        </div>
        <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
          <dt className="text-zinc-500">Close</dt>
          <dd className="mt-1 text-zinc-100">{formatPrice(selectedBar.close)}</dd>
        </div>
      </dl>

      <div className="space-y-5">
        {Object.entries(optionsByField).map(([groupName, options]) => (
          <TagGroup
            key={`${selectedBar.id}:${groupName}`}
            groupName={groupName}
            options={options}
            sessionId={sessionId}
            barId={selectedBar.id}
            selectedTags={selectedTagsSet}
          />
        ))}
      </div>
    </div>
  );
}
