"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CandlestickSeries,
  createChart,
  createSeriesMarkers,
  type IChartApi,
  type ISeriesMarkersPluginApi,
  type MouseEventParams,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";

export type ChartBar = {
  id: number;
  barNumber: number;
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
};

export type BarTagMarker = {
  barNumber: number;
  count: number;
};

export type SegmentTagMarker = {
  startBarNumber: number;
  endBarNumber: number;
  count: number;
};

export type ContextTagMarker = {
  barNumber: number;
  count: number;
};

export type OutcomeTagMarker = {
  barNumber: number;
  count: number;
};

type ChartProps = {
  bars: ChartBar[];
  barTagMarkers?: BarTagMarker[];
  contextTagMarkers?: ContextTagMarker[];
  segmentTagMarkers?: SegmentTagMarker[];
  outcomeTagMarkers?: OutcomeTagMarker[];
  selectedBarNumber?: number | null;
  selectedRange?: { start: number; end: number } | null;
  onSelectBar?: (bar: ChartBar, meta: { rangeMode: boolean }) => void;
};

function formatPrice(value: number) {
  return value.toFixed(2);
}

export function Chart({
  bars,
  barTagMarkers = [],
  contextTagMarkers = [],
  segmentTagMarkers = [],
  outcomeTagMarkers = [],
  selectedBarNumber,
  selectedRange,
  onSelectBar,
}: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const selectedMarkerRef = useRef<ISeriesMarkersPluginApi<Time> | null>(
    null,
  );
  const [hoveredBar, setHoveredBar] = useState<ChartBar | null>(bars[0] ?? null);
  const [showSavedMarkers, setShowSavedMarkers] = useState(true);
  const [isDarkTheme, setIsDarkTheme] = useState(true);

  useEffect(() => {
    function syncTheme() {
      setIsDarkTheme(document.documentElement.classList.contains("dark"));
    }

    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, {
      attributeFilter: ["class"],
      attributes: true,
    });

    return () => observer.disconnect();
  }, []);

  const barsByTime = useMemo(() => {
    return new Map(bars.map((bar) => [bar.time, bar]));
  }, [bars]);

  const selectedBar = useMemo(() => {
    if (!Number.isInteger(selectedBarNumber)) return null;
    return bars.find((bar) => bar.barNumber === selectedBarNumber) ?? null;
  }, [bars, selectedBarNumber]);

  const selectedRangeBars = useMemo(() => {
    if (!selectedRange) return [];

    const start = Math.min(selectedRange.start, selectedRange.end);
    const end = Math.max(selectedRange.start, selectedRange.end);

    return bars.filter(
      (bar) => bar.barNumber >= start && bar.barNumber <= end,
    );
  }, [bars, selectedRange]);

  const labeledBars = useMemo(() => {
    const countsByBarNumber = new Map(
      barTagMarkers.map((marker) => [marker.barNumber, marker.count]),
    );

    return bars
      .map((bar) => ({
        bar,
        count: countsByBarNumber.get(bar.barNumber) ?? 0,
      }))
      .filter((marker) => marker.count > 0);
  }, [bars, barTagMarkers]);

  const contextBars = useMemo(() => {
    const countsByBarNumber = new Map(
      contextTagMarkers.map((marker) => [marker.barNumber, marker.count]),
    );

    return bars
      .map((bar) => ({
        bar,
        count: countsByBarNumber.get(bar.barNumber) ?? 0,
      }))
      .filter((marker) => marker.count > 0);
  }, [bars, contextTagMarkers]);

  const outcomeBars = useMemo(() => {
    const countsByBarNumber = new Map(
      outcomeTagMarkers.map((marker) => [marker.barNumber, marker.count]),
    );

    return bars
      .map((bar) => ({
        bar,
        count: countsByBarNumber.get(bar.barNumber) ?? 0,
      }))
      .filter((marker) => marker.count > 0);
  }, [bars, outcomeTagMarkers]);

  const savedSegmentBars = useMemo(() => {
    return segmentTagMarkers.flatMap((segment, segmentIndex) => {
      const start = Math.min(segment.startBarNumber, segment.endBarNumber);
      const end = Math.max(segment.startBarNumber, segment.endBarNumber);
      const segmentBars = bars.filter(
        (bar) => bar.barNumber >= start && bar.barNumber <= end,
      );

      return segmentBars.map((bar, barIndex) => {
        const isEdge = barIndex === 0 || barIndex === segmentBars.length - 1;

        return {
          bar,
          segmentIndex,
          isEdge,
          count: segment.count,
        };
      });
    });
  }, [bars, segmentTagMarkers]);

  const numberedBars = useMemo(() => {
    return bars.filter((bar) => bar.barNumber % 3 === 0);
  }, [bars]);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: isDarkTheme ? "#0a0a0a" : "#ffffff" },
        textColor: isDarkTheme ? "#d4d4d8" : "#3f3f46",
      },
      grid: {
        vertLines: { color: isDarkTheme ? "#1f1f23" : "#e4e4e7" },
        horzLines: { color: isDarkTheme ? "#1f1f23" : "#e4e4e7" },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: isDarkTheme ? "#27272a" : "#d4d4d8",
      },
      rightPriceScale: { borderColor: isDarkTheme ? "#27272a" : "#d4d4d8" },
      crosshair: {
        vertLine: { color: isDarkTheme ? "#71717a" : "#a1a1aa" },
        horzLine: { color: isDarkTheme ? "#71717a" : "#a1a1aa" },
      },
      autoSize: true,
    });
    chartRef.current = chart;

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      borderVisible: false,
    });

    series.setData(
      bars.map((bar) => ({
        time: bar.time as UTCTimestamp,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
      })),
    );
    selectedMarkerRef.current = createSeriesMarkers(series, [], {
      autoScale: true,
      zOrder: "top",
    });

    function handleCrosshairMove(param: MouseEventParams) {
      if (typeof param.time === "number") {
        setHoveredBar(barsByTime.get(param.time) ?? null);
      }
    }

    function handleClick(param: MouseEventParams) {
      if (typeof param.time !== "number") {
        return;
      }

      const bar = barsByTime.get(param.time);
      if (bar) {
        onSelectBar?.(bar, {
          rangeMode: param.sourceEvent?.shiftKey ?? false,
        });
      }
    }

    chart.subscribeCrosshairMove(handleCrosshairMove);
    chart.subscribeClick(handleClick);
    chart.timeScale().fitContent();

    return () => {
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      chart.unsubscribeClick(handleClick);
      selectedMarkerRef.current?.detach();
      selectedMarkerRef.current = null;
      chart.remove();
      chartRef.current = null;
    };
  }, [bars, barsByTime, isDarkTheme, onSelectBar]);

  useEffect(() => {
    const markerApi = selectedMarkerRef.current;
    if (!markerApi) return;

    const markers: SeriesMarker<Time>[] = [];

    if (showSavedMarkers) {
      const barMarkers: SeriesMarker<Time>[] = labeledBars.map(({ bar, count }) => ({
        id: `bar-tags-${bar.id}`,
        time: bar.time as UTCTimestamp,
        position: "aboveBar",
        shape: "circle",
        color: "#22c55e",
        text: count > 1 ? String(count) : undefined,
        size: 0.55,
      }));

      const savedSegmentMarkers: SeriesMarker<Time>[] = savedSegmentBars.map(
        ({ bar, segmentIndex, isEdge, count }) => ({
          id: `segment-tags-${segmentIndex}-${bar.id}`,
          time: bar.time as UTCTimestamp,
          position: "belowBar",
          shape: "square",
          color: "#a78bfa",
          text: isEdge && count > 1 ? String(count) : undefined,
          size: isEdge ? 0.62 : 0.32,
        }),
      );

      const contextMarkers: SeriesMarker<Time>[] = contextBars.map(
        ({ bar, count }) => ({
          id: `context-tags-${bar.id}`,
          time: bar.time as UTCTimestamp,
          position: "belowBar",
          shape: "arrowUp",
          color: "#f59e0b",
          text: count > 1 ? String(count) : undefined,
          size: 0.72,
        }),
      );

      const outcomeMarkers: SeriesMarker<Time>[] = outcomeBars.map(
        ({ bar, count }) => ({
          id: `outcome-tags-${bar.id}`,
          time: bar.time as UTCTimestamp,
          position: "aboveBar",
          shape: "arrowDown",
          color: "#ec4899",
          text: count > 1 ? String(count) : undefined,
          size: 0.72,
        }),
      );

      const barNumberMarkers: SeriesMarker<Time>[] = numberedBars.map((bar) => ({
        id: `bar-number-${bar.id}`,
        time: bar.time as UTCTimestamp,
        position: "belowBar",
        shape: "circle",
        color: "#71717a",
        text: String(bar.barNumber),
        size: 0,
      }));

      markers.push(
        ...barMarkers,
        ...savedSegmentMarkers,
        ...contextMarkers,
        ...outcomeMarkers,
        ...barNumberMarkers,
      );
    }

    const rangeMarkers: SeriesMarker<Time>[] = selectedRangeBars.map((bar, index) => {
      const isEdge =
        index === 0 || index === selectedRangeBars.length - 1;

      return {
        id: `selected-range-${bar.id}`,
        time: bar.time as UTCTimestamp,
        position: "belowBar",
        shape: "square",
        color: "#38bdf8",
        text: isEdge ? `#${bar.barNumber}` : undefined,
        size: isEdge ? 0.9 : 0.45,
      };
    });

    markers.push(...rangeMarkers);

    if (selectedBar) {
      markers.push({
        id: `selected-bar-${selectedBar.id}`,
        time: selectedBar.time as UTCTimestamp,
        position: "belowBar",
        shape: "circle",
        color: "#facc15",
        text: `#${selectedBar.barNumber}`,
        size: 1.25,
      });
    }

    if (markers.length === 0) {
      markerApi.setMarkers([]);
      return;
    }

    markerApi.setMarkers(markers);
  }, [
    contextBars,
    labeledBars,
    numberedBars,
    outcomeBars,
    savedSegmentBars,
    selectedBar,
    selectedRangeBars,
    showSavedMarkers,
  ]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-11 items-center justify-between gap-4 border-b border-zinc-200 px-4 font-mono text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        <div className="flex min-w-0 items-center gap-4 overflow-hidden">
          {selectedRange ? (
            <span className="shrink-0 text-sky-300">
              Range #{Math.min(selectedRange.start, selectedRange.end)}-
              {Math.max(selectedRange.start, selectedRange.end)}
            </span>
          ) : null}
          {hoveredBar ? (
            <>
              <span className="shrink-0 text-zinc-950 dark:text-zinc-100">
                #{hoveredBar.barNumber}
              </span>
              <span className="shrink-0">O {formatPrice(hoveredBar.open)}</span>
              <span className="shrink-0">H {formatPrice(hoveredBar.high)}</span>
              <span className="shrink-0">L {formatPrice(hoveredBar.low)}</span>
              <span className="shrink-0">C {formatPrice(hoveredBar.close)}</span>
              <span className="shrink-0">V {hoveredBar.volume ?? "-"}</span>
            </>
          ) : (
            <span>Hover a bar for OHLC</span>
          )}
        </div>
        <button
          type="button"
          aria-pressed={showSavedMarkers}
          onClick={() => setShowSavedMarkers((value) => !value)}
          className={
            "h-7 min-w-16 shrink-0 rounded border px-2.5 text-xs font-medium transition-colors " +
            (showSavedMarkers
              ? "border-zinc-400 bg-zinc-200 text-zinc-950 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              : "border-zinc-300 bg-white text-zinc-500 hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-500 dark:hover:border-zinc-700 dark:hover:text-zinc-300")
          }
        >
          Marks
        </button>
      </div>
      <div ref={containerRef} className="min-h-0 flex-1" />
    </div>
  );
}
