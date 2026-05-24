"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import type { ChartBar } from "@/components/chart/Chart";
import { deleteBarLabel, upsertBarLabel } from "@/lib/actions/label";
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
  if (field === "bar_quality") return "Bar Quality";
  if (field === "bar_role") return "Bar Role";
  return field;
}

function groupOptions(options: LabelDictionaryItem[]) {
  return options.reduce<Record<string, LabelDictionaryItem[]>>((groups, option) => {
    groups[option.field] ??= [];
    groups[option.field].push(option);
    return groups;
  }, {});
}

function FieldOptions({
  field,
  initialValue,
  options,
  sessionId,
  barId,
  note,
}: {
  field: string;
  initialValue: string | null;
  options: LabelDictionaryItem[];
  sessionId: number;
  barId: number;
  note: string | null;
}) {
  const [value, setValue] = useState<string | null>(initialValue);
  const [isPending, startTransition] = useTransition();

  function handleClick(optionKey: string) {
    const isToggleOff = value === optionKey;
    const prevValue = value;
    setValue(isToggleOff ? null : optionKey);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("sessionId", String(sessionId));
      formData.set("barId", String(barId));
      formData.set("field", field);

      try {
        if (isToggleOff) {
          await deleteBarLabel(formData);
        } else {
          formData.set("value", optionKey);
          formData.set("note", note ?? "");
          await upsertBarLabel(formData);
        }
      } catch (err) {
        console.error("Label save failed", err);
        setValue(prevValue);
      }
    });
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {labelForField(field)}
      </legend>
      <div className="grid gap-2">
        {options.map((option) => {
          const selected = value === option.key;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              disabled={isPending}
              onClick={() => handleClick(option.key)}
              title={option.description ?? undefined}
              className={
                "flex w-full items-start gap-3 rounded border p-3 text-left text-sm transition-colors disabled:cursor-wait disabled:opacity-70 " +
                (selected
                  ? "border-emerald-500/70 bg-emerald-500/10 text-zinc-100"
                  : "border-zinc-800 bg-zinc-900/30 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-900")
              }
            >
              <span
                className={
                  "mt-1 h-2.5 w-2.5 rounded-full border " +
                  (selected
                    ? "border-emerald-400 bg-emerald-400"
                    : "border-zinc-600")
                }
              />
              <span>
                <span className="block font-medium text-zinc-100">
                  {option.label}
                </span>
                <span className="block font-mono text-xs text-zinc-500">
                  {option.key}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
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
    if (!Number.isInteger(selectedBarNumber)) return null;
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
        <p className="text-sm text-zinc-500">Click a candle to select a bar.</p>
      </div>
    );
  }

  const barLabels = labelsByBarId[selectedBar.id] ?? {};
  const anyNote =
    Object.values(barLabels).find((label) => label.note)?.note ?? "";

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
          <FieldOptions
            key={`${selectedBar.id}:${field}`}
            field={field}
            initialValue={barLabels[field]?.value ?? null}
            options={options}
            sessionId={sessionId}
            barId={selectedBar.id}
            note={barLabels[field]?.note ?? null}
          />
        ))}

        <label className="block space-y-2">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Note
          </span>
          <textarea
            readOnly
            rows={3}
            value={anyNote}
            placeholder="Note saving comes next."
            className="w-full resize-none rounded border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-sm text-zinc-400 placeholder:text-zinc-600"
          />
        </label>
      </div>
    </div>
  );
}
