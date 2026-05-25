"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import {
  Chart,
  type BarTagMarker,
  type ChartBar,
  type SegmentTagMarker,
} from "@/components/chart/Chart";

export function SelectableChart({
  bars,
  barTagMarkers,
  segmentTagMarkers,
}: {
  bars: ChartBar[];
  barTagMarkers: BarTagMarker[];
  segmentTagMarkers: SegmentTagMarker[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedBarNumber = useMemo(() => {
    const rawBar = searchParams.get("bar");
    if (rawBar === null) return null;

    const barNumber = Number(rawBar);
    return Number.isInteger(barNumber) ? barNumber : null;
  }, [searchParams]);

  const selectedRange = useMemo(() => {
    const rawStart = searchParams.get("rangeStart");
    const rawEnd = searchParams.get("rangeEnd");
    if (rawStart === null || rawEnd === null) return null;

    const start = Number(rawStart);
    const end = Number(rawEnd);
    if (!Number.isInteger(start) || !Number.isInteger(end)) return null;

    return {
      start: Math.min(start, end),
      end: Math.max(start, end),
    };
  }, [searchParams]);

  const selectBar = useCallback(
    (bar: ChartBar, meta: { rangeMode: boolean }) => {
      const nextParams = new URLSearchParams(searchParams);

      if (meta.rangeMode) {
        const anchor = selectedBarNumber ?? selectedRange?.start ?? bar.barNumber;
        const start = Math.min(anchor, bar.barNumber);
        const end = Math.max(anchor, bar.barNumber);

        nextParams.delete("bar");
        nextParams.set("rangeStart", String(start));
        nextParams.set("rangeEnd", String(end));
        router.replace(`${pathname}?${nextParams.toString()}`, {
          scroll: false,
        });
        return;
      }

      nextParams.set("bar", String(bar.barNumber));
      nextParams.delete("rangeStart");
      nextParams.delete("rangeEnd");
      router.replace(`${pathname}?${nextParams.toString()}`, {
        scroll: false,
      });
    },
    [pathname, router, searchParams, selectedBarNumber, selectedRange],
  );

  return (
    <Chart
      bars={bars}
      barTagMarkers={barTagMarkers}
      segmentTagMarkers={segmentTagMarkers}
      selectedBarNumber={selectedBarNumber}
      selectedRange={selectedRange}
      onSelectBar={selectBar}
    />
  );
}
