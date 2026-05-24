"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

import type { ChartBar } from "@/components/chart/Chart";

function formatPrice(value: number) {
  return value.toFixed(2);
}

export function BarSelectionPanel({ bars }: { bars: ChartBar[] }) {
  const searchParams = useSearchParams();
  const selectedBarNumber = Number(searchParams.get("bar"));

  const selectedBar = useMemo(() => {
    if (!Number.isInteger(selectedBarNumber)) {
      return null;
    }

    return bars.find((bar) => bar.barNumber === selectedBarNumber) ?? null;
  }, [bars, selectedBarNumber]);

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
        Label choices come next.
      </div>
    </div>
  );
}
