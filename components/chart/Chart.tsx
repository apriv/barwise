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

type ChartProps = {
  bars: ChartBar[];
  barTagMarkers?: BarTagMarker[];
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

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "#0a0a0a" },
        textColor: "#d4d4d8",
      },
      grid: {
        vertLines: { color: "#1f1f23" },
        horzLines: { color: "#1f1f23" },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: "#27272a",
      },
      rightPriceScale: { borderColor: "#27272a" },
      crosshair: {
        vertLine: { color: "#71717a" },
        horzLine: { color: "#71717a" },
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
  }, [bars, barsByTime, onSelectBar]);

  useEffect(() => {
    const markerApi = selectedMarkerRef.current;
    if (!markerApi) return;

    const markers: SeriesMarker<Time>[] = labeledBars.map(({ bar, count }) => ({
      id: `bar-tags-${bar.id}`,
      time: bar.time as UTCTimestamp,
      position: "aboveBar",
      shape: "circle",
      color: "#22c55e",
      text: count > 1 ? String(count) : undefined,
      size: 0.55,
    }));

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
  }, [labeledBars, selectedBar, selectedRangeBars]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-11 items-center gap-4 border-b border-zinc-800 px-4 font-mono text-xs text-zinc-400">
        {selectedRange ? (
          <span className="text-sky-300">
            Range #{Math.min(selectedRange.start, selectedRange.end)}-
            {Math.max(selectedRange.start, selectedRange.end)}
          </span>
        ) : null}
        {hoveredBar ? (
          <>
            <span className="text-zinc-100">#{hoveredBar.barNumber}</span>
            <span>O {formatPrice(hoveredBar.open)}</span>
            <span>H {formatPrice(hoveredBar.high)}</span>
            <span>L {formatPrice(hoveredBar.low)}</span>
            <span>C {formatPrice(hoveredBar.close)}</span>
            <span>V {hoveredBar.volume ?? "-"}</span>
          </>
        ) : (
          <span>Hover a bar for OHLC</span>
        )}
      </div>
      <div ref={containerRef} className="min-h-0 flex-1" />
    </div>
  );
}
