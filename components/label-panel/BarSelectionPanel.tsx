"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

import type { ChartBar } from "@/components/chart/Chart";
import type { LabelDictionaryItem } from "@/lib/repo/dictionary";

type BarSelectionPanelProps = {
  bars: ChartBar[];
  labelOptions: LabelDictionaryItem[];
};

function formatPrice(value: number) {
  return value.toFixed(2);
}

function labelForField(field: string) {
  if (field === "bar_quality") {
    return "Bar Quality";
  }

  if (field === "bar_role") {
    return "Bar Role";
  }

  return field;
}

function groupOptions(options: LabelDictionaryItem[]) {
  return options.reduce<Record<string, LabelDictionaryItem[]>>((groups, option) => {
    groups[option.field] ??= [];
    groups[option.field].push(option);
    return groups;
  }, {});
}

export function BarSelectionPanel({
  bars,
  labelOptions,
}: BarSelectionPanelProps) {
  const searchParams = useSearchParams();
  const selectedBarNumber = Number(searchParams.get("bar"));

  const selectedBar = useMemo(() => {
    if (!Number.isInteger(selectedBarNumber)) {
      return null;
    }

    return bars.find((bar) => bar.barNumber === selectedBarNumber) ?? null;
  }, [bars, selectedBarNumber]);
  const optionsByField = useMemo(
    () => groupOptions(labelOptions),
    [labelOptions],
  );

  if (!selectedBar) {
    return (
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-zinc-100">Bar Label</h2>
        <p className="text-sm text-zinc-500">
          Click a candle to select a bar.
        </p>
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

      <div className="rounded border border-dashed border-zinc-800 p-3 text-sm text-zinc-500">
        Label saving comes next.
      </div>

      <div className="space-y-5">
        {Object.entries(optionsByField).map(([field, options]) => (
          <fieldset key={field} className="space-y-2">
            <legend className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              {labelForField(field)}
            </legend>
            <div className="grid gap-2">
              {options.map((option) => (
                <label
                  key={option.id}
                  className="flex cursor-not-allowed items-start gap-3 rounded border border-zinc-800 bg-zinc-900/30 p-3 text-sm text-zinc-300"
                  title={option.description ?? undefined}
                >
                  <input
                    type="radio"
                    name={field}
                    value={option.key}
                    disabled
                    className="mt-1"
                  />
                  <span>
                    <span className="block font-medium text-zinc-100">
                      {option.label}
                    </span>
                    <span className="block font-mono text-xs text-zinc-500">
                      {option.key}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}

        <label className="block space-y-2">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Note
          </span>
          <textarea
            disabled
            rows={3}
            placeholder="Note saving comes next."
            className="w-full resize-none rounded border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-sm text-zinc-400 placeholder:text-zinc-600"
          />
        </label>
      </div>
    </div>
  );
}
