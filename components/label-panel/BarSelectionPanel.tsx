"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

import type { ChartBar } from "@/components/chart/Chart";
import { upsertBarLabel } from "@/lib/actions/label";
import type { LabelDictionaryItem } from "@/lib/repo/dictionary";
import type { BarLabelRecord } from "@/lib/repo/labels";

type BarSelectionPanelProps = {
  bars: ChartBar[];
  labels: BarLabelRecord[];
  labelOptions: LabelDictionaryItem[];
  sessionId: number;
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
  labels,
  labelOptions,
  sessionId,
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
  const labelsByBarId = useMemo(() => {
    return labels.reduce<Record<number, Record<string, BarLabelRecord>>>(
      (groups, label) => {
        groups[label.bar_id] ??= {};
        groups[label.bar_id][label.field] = label;
        return groups;
      },
      {},
    );
  }, [labels]);

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

      <div className="space-y-5">
        {Object.entries(optionsByField).map(([field, options]) => (
          <fieldset key={field} className="space-y-2">
            <legend className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              {labelForField(field)}
            </legend>
            <div className="grid gap-2">
              {options.map((option) => (
                <form
                  key={option.id}
                  action={upsertBarLabel}
                >
                  <input type="hidden" name="sessionId" value={sessionId} />
                  <input type="hidden" name="barId" value={selectedBar.id} />
                  <input type="hidden" name="field" value={field} />
                  <input type="hidden" name="value" value={option.key} />
                  <input
                    type="hidden"
                    name="note"
                    value={labelsByBarId[selectedBar.id]?.[field]?.note ?? ""}
                  />
                  <input
                    aria-label={`${labelForField(field)} ${option.label}`}
                    checked={
                      labelsByBarId[selectedBar.id]?.[field]?.value ===
                      option.key
                    }
                    className="peer sr-only"
                    readOnly
                    type="radio"
                  />
                  <button
                    className="flex w-full items-start gap-3 rounded border border-zinc-800 bg-zinc-900/30 p-3 text-left text-sm text-zinc-300 hover:border-zinc-600 hover:bg-zinc-900 peer-checked:border-emerald-500/70 peer-checked:bg-emerald-500/10"
                    title={option.description ?? undefined}
                    type="submit"
                  >
                    <span className="mt-1 h-2.5 w-2.5 rounded-full border border-zinc-600 peer-checked:border-emerald-400 peer-checked:bg-emerald-400" />
                    <span>
                      <span className="block font-medium text-zinc-100">
                        {option.label}
                      </span>
                      <span className="block font-mono text-xs text-zinc-500">
                        {option.key}
                      </span>
                    </span>
                  </button>
                </form>
              ))}
            </div>
          </fieldset>
        ))}

        <label className="block space-y-2">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Note
          </span>
          <textarea
            readOnly
            rows={3}
            value={
              Object.values(labelsByBarId[selectedBar.id] ?? {}).find(
                (label) => label.note,
              )?.note ?? ""
            }
            placeholder="Note saving comes next."
            className="w-full resize-none rounded border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-sm text-zinc-400 placeholder:text-zinc-600"
          />
        </label>
      </div>
    </div>
  );
}
