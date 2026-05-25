"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useOptimistic, useState, useTransition } from "react";

import type { ChartBar } from "@/components/chart/Chart";
import {
  deleteBarTag,
  deleteContextTag,
  deleteSegmentTag,
  upsertBarTag,
  upsertContextTag,
  upsertSegmentTag,
} from "@/lib/actions/label";
import type { LabelDictionaryItem } from "@/lib/repo/dictionary";
import type {
  BarTagRecord,
  ContextTagRecord,
  SegmentTagRecord,
} from "@/lib/repo/labels";

type BarSelectionPanelProps = {
  bars: ChartBar[];
  barTags: BarTagRecord[];
  contextTags: ContextTagRecord[];
  segmentTags: SegmentTagRecord[];
  barTagOptions: LabelDictionaryItem[];
  contextTagOptions: LabelDictionaryItem[];
  segmentTagOptions: LabelDictionaryItem[];
  sessionId: number;
};

type FormFields = Record<string, number | string>;
type ToggleAction = (formData: FormData) => Promise<void>;

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
  market_context: "Market Context",
  trend_direction: "Trend Direction",
  current_location: "Current Location",
  current_event: "Current Event",
  trade_quality: "Trade Quality",
  segment_kind: "Segment Kind",
};

function formatGroupName(groupName: string) {
  return groupLabels[groupName] ?? groupName.replaceAll("_", " ");
}

function TagGroup({
  groupName,
  options,
  formFields,
  selectedTags,
  upsertAction,
  deleteAction,
}: {
  groupName: string;
  options: LabelDictionaryItem[];
  formFields: FormFields;
  selectedTags: Set<string>;
  upsertAction: ToggleAction;
  deleteAction: ToggleAction;
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
  const [isExpanded, setIsExpanded] = useState(true);

  const selectedCount = options.filter((option) =>
    optimisticTags.has(option.key),
  ).length;

  function handleToggle(tagKey: string) {
    const isSelected = optimisticTags.has(tagKey);

    startTransition(async () => {
      toggleOptimisticTag(tagKey);

      const formData = new FormData();
      Object.entries(formFields).forEach(([key, value]) => {
        formData.set(key, String(value));
      });

      try {
        if (isSelected) {
          formData.set("tagKey", tagKey);
          await deleteAction(formData);
        } else {
          formData.set("tagKey", tagKey);
          await upsertAction(formData);
        }
      } catch (err) {
        console.error("Tag update failed", err);
      }
    });
  }

  return (
    <fieldset className="space-y-3 rounded border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950/60">
      <div className="flex items-center justify-between gap-3">
        <legend className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {formatGroupName(groupName)}
        </legend>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-600">
            {selectedCount}
          </span>
          <button
            type="button"
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded((value) => !value)}
            className="grid h-6 w-6 place-items-center rounded border border-zinc-300 bg-white font-mono text-xs text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-500 dark:hover:border-zinc-700 dark:hover:text-zinc-200"
          >
            {isExpanded ? "-" : "+"}
          </button>
        </div>
      </div>
      {isExpanded ? (
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
                    ? "border-emerald-500/70 bg-emerald-50 text-emerald-800 dark:border-emerald-500/80 dark:bg-emerald-500/15 dark:text-emerald-100 shadow-[0_0_0_1px_rgba(52,211,153,0.18)]"
                    : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-100 hover:text-zinc-950 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-900 dark:hover:text-zinc-100")
                }
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </fieldset>
  );
}

export function BarSelectionPanel({
  bars,
  barTags,
  contextTags,
  segmentTags,
  barTagOptions,
  contextTagOptions,
  segmentTagOptions,
  sessionId,
}: BarSelectionPanelProps) {
  const searchParams = useSearchParams();
  const [showOhlc, setShowOhlc] = useState(false);
  const selectedBarNumber = Number(searchParams.get("bar"));
  const rangeStartNumber = Number(searchParams.get("rangeStart"));
  const rangeEndNumber = Number(searchParams.get("rangeEnd"));

  const selectedBar = useMemo(() => {
    if (!Number.isInteger(selectedBarNumber)) return null;
    return bars.find((bar) => bar.barNumber === selectedBarNumber) ?? null;
  }, [bars, selectedBarNumber]);

  const selectedRange = useMemo(() => {
    if (
      !Number.isInteger(rangeStartNumber) ||
      !Number.isInteger(rangeEndNumber)
    ) {
      return null;
    }

    const startNumber = Math.min(rangeStartNumber, rangeEndNumber);
    const endNumber = Math.max(rangeStartNumber, rangeEndNumber);
    const startBar =
      bars.find((bar) => bar.barNumber === startNumber) ?? null;
    const endBar = bars.find((bar) => bar.barNumber === endNumber) ?? null;

    if (!startBar || !endBar) return null;

    return {
      startNumber,
      endNumber,
      startBar,
      endBar,
      count: endNumber - startNumber + 1,
    };
  }, [bars, rangeEndNumber, rangeStartNumber]);

  const barOptionsByGroup = useMemo(
    () => groupOptions(barTagOptions),
    [barTagOptions],
  );

  const contextOptionsByGroup = useMemo(
    () => groupOptions(contextTagOptions),
    [contextTagOptions],
  );

  const segmentOptionsByGroup = useMemo(
    () => groupOptions(segmentTagOptions),
    [segmentTagOptions],
  );

  const selectedBarTagsSet = useMemo(() => {
    if (!selectedBar) return new Set<string>();
    return new Set(
      barTags
        .filter((tag) => tag.bar_id === selectedBar.id)
        .map((tag) => tag.tag_key),
    );
  }, [barTags, selectedBar]);

  const selectedContextTagsSet = useMemo(() => {
    if (!selectedBar) return new Set<string>();
    return new Set(
      contextTags
        .filter((tag) => tag.bar_id === selectedBar.id)
        .map((tag) => tag.tag_key),
    );
  }, [contextTags, selectedBar]);

  const selectedSegmentTagsSet = useMemo(() => {
    if (!selectedRange) return new Set<string>();
    return new Set(
      segmentTags
        .filter(
          (tag) =>
            tag.start_bar_id === selectedRange.startBar.id &&
            tag.end_bar_id === selectedRange.endBar.id,
        )
        .map((tag) => tag.tag_key),
    );
  }, [segmentTags, selectedRange]);

  if (selectedRange) {
    const segmentFormFields = {
      sessionId,
      startBarId: selectedRange.startBar.id,
      endBarId: selectedRange.endBar.id,
    };

    return (
      <div className="space-y-5">
        <div className="space-y-1">
          <h2 className="text-sm font-medium text-zinc-950 dark:text-zinc-100">
            Range #{selectedRange.startNumber}-{selectedRange.endNumber}
          </h2>
          <p className="text-xs text-zinc-500">
            {selectedRange.count} bars selected
          </p>
        </div>

        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Segment Tags
          </h3>
          {Object.entries(segmentOptionsByGroup).map(([groupName, options]) => (
            <TagGroup
              key={`${selectedRange.startBar.id}:${selectedRange.endBar.id}:segment:${groupName}`}
              groupName={groupName}
              options={options}
              formFields={segmentFormFields}
              selectedTags={selectedSegmentTagsSet}
              upsertAction={upsertSegmentTag}
              deleteAction={deleteSegmentTag}
            />
          ))}
        </section>
      </div>
    );
  }

  if (!selectedBar) {
    return (
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-zinc-950 dark:text-zinc-100">Bar Tags</h2>
        <p className="text-sm text-zinc-500">Click a candle to select a bar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-sm font-medium text-zinc-950 dark:text-zinc-100">
            Bar #{selectedBar.barNumber}
          </h2>
          <p className="text-xs text-zinc-500">Selected from chart</p>
        </div>
        <button
          type="button"
          aria-expanded={showOhlc}
          onClick={() => setShowOhlc((value) => !value)}
          className={
            "h-7 rounded border px-2.5 text-xs font-medium transition-colors " +
            (showOhlc
              ? "border-zinc-400 bg-zinc-200 text-zinc-950 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              : "border-zinc-300 bg-white text-zinc-500 hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-500 dark:hover:border-zinc-700 dark:hover:text-zinc-300")
          }
        >
          OHLC
        </button>
      </div>

      {showOhlc ? (
        <dl className="grid grid-cols-2 gap-3 font-mono text-xs">
          <div className="rounded border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
            <dt className="text-zinc-500">Open</dt>
            <dd className="mt-1 text-zinc-950 dark:text-zinc-100">
              {formatPrice(selectedBar.open)}
            </dd>
          </div>
          <div className="rounded border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
            <dt className="text-zinc-500">High</dt>
            <dd className="mt-1 text-zinc-950 dark:text-zinc-100">
              {formatPrice(selectedBar.high)}
            </dd>
          </div>
          <div className="rounded border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
            <dt className="text-zinc-500">Low</dt>
            <dd className="mt-1 text-zinc-950 dark:text-zinc-100">
              {formatPrice(selectedBar.low)}
            </dd>
          </div>
          <div className="rounded border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
            <dt className="text-zinc-500">Close</dt>
            <dd className="mt-1 text-zinc-950 dark:text-zinc-100">
              {formatPrice(selectedBar.close)}
            </dd>
          </div>
        </dl>
      ) : null}

      <div className="space-y-5">
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Bar Tags
          </h3>
          {Object.entries(barOptionsByGroup).map(([groupName, options]) => (
            <TagGroup
              key={`${selectedBar.id}:bar:${groupName}`}
              groupName={groupName}
              options={options}
              formFields={{ sessionId, barId: selectedBar.id }}
              selectedTags={selectedBarTagsSet}
              upsertAction={upsertBarTag}
              deleteAction={deleteBarTag}
            />
          ))}
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Context Tags
          </h3>
          {Object.entries(contextOptionsByGroup).map(([groupName, options]) => (
            <TagGroup
              key={`${selectedBar.id}:context:${groupName}`}
              groupName={groupName}
              options={options}
              formFields={{ sessionId, barId: selectedBar.id }}
              selectedTags={selectedContextTagsSet}
              upsertAction={upsertContextTag}
              deleteAction={deleteContextTag}
            />
          ))}
        </section>
      </div>
    </div>
  );
}
