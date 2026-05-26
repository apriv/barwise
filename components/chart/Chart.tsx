"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CandlestickSeries,
  createChart,
  createSeriesMarkers,
  LineSeries,
  LineStyle,
  type IChartApi,
  type ISeriesMarkersPluginApi,
  type ISeriesApi,
  type LineData,
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
  tagKeys: string[];
};

export type SegmentTagMarker = {
  startBarNumber: number;
  endBarNumber: number;
  count: number;
  tagKeys: string[];
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

type TradingRangeOverlay = {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
};

function formatPrice(value: number) {
  return value.toFixed(2);
}

function removeWedgeSeries(
  chart: IChartApi | null,
  seriesList: ISeriesApi<"Line", Time>[],
) {
  if (!chart) return;

  for (const series of seriesList) {
    try {
      chart.removeSeries(series);
    } catch {
      // The chart can already have removed child series during teardown.
    }
  }
}

export function Chart({
  bars,
  barTagMarkers = [],
  segmentTagMarkers = [],
  selectedBarNumber,
  selectedRange,
  onSelectBar,
}: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick", Time> | null>(null);
  const selectedMarkerRef = useRef<ISeriesMarkersPluginApi<Time> | null>(
    null,
  );
  const annotationLineSeriesRef = useRef<ISeriesApi<"Line", Time>[]>([]);
  const [tradingRangeOverlays, setTradingRangeOverlays] = useState<
    TradingRangeOverlay[]
  >([]);
  const [chartReadyToken, setChartReadyToken] = useState(0);
  const [hoveredBar, setHoveredBar] = useState<ChartBar | null>(bars[0] ?? null);
  const [showSavedMarkers, setShowSavedMarkers] = useState(true);

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
    const markersByBarNumber = new Map(
      barTagMarkers.map((marker) => [marker.barNumber, marker]),
    );

    return bars
      .map((bar) => {
        const marker = markersByBarNumber.get(bar.barNumber);
        const longEntryCount =
          marker?.tagKeys.filter((tagKey) => tagKey === "long_entry").length ??
          0;
        const shortEntryCount =
          marker?.tagKeys.filter((tagKey) => tagKey === "short_entry").length ??
          0;
        return {
          bar,
          count: marker?.count ?? 0,
          longEntryCount,
          shortEntryCount,
        };
      })
      .filter((marker) => marker.count > 0);
  }, [bars, barTagMarkers]);

  const numberedBars = useMemo(() => {
    return bars.filter((bar) => bar.barNumber % 3 === 0);
  }, [bars]);

  const annotationLines = useMemo(() => {
    return segmentTagMarkers.flatMap((segment, segmentIndex) => {
      const start = Math.min(segment.startBarNumber, segment.endBarNumber);
      const end = Math.max(segment.startBarNumber, segment.endBarNumber);
      const rangeBars = bars.filter(
        (bar) => bar.barNumber >= start && bar.barNumber <= end,
      );
      const startBar = bars.find((bar) => bar.barNumber === start);
      const endBar = bars.find((bar) => bar.barNumber === end);

      if (!startBar || !endBar) {
        return [];
      }

      return segment.tagKeys.flatMap((tagKey, tagIndex) => {
        if (tagKey === "wedge_up") {
          return {
            id: `wedge-up-${segmentIndex}-${tagIndex}`,
            startBar,
            endBar,
            startValue: startBar.high,
            endValue: endBar.high,
            color: "#a78bfa",
          };
        }

        if (tagKey === "wedge_down") {
          return {
            id: `wedge-down-${segmentIndex}-${tagIndex}`,
            startBar,
            endBar,
            startValue: startBar.low,
            endValue: endBar.low,
            color: "#a78bfa",
          };
        }

        if (tagKey === "double_top") {
          const lowerHigh = Math.min(startBar.high, endBar.high);

          return {
            id: `double-top-${segmentIndex}-${tagIndex}`,
            startBar,
            endBar,
            startValue: lowerHigh,
            endValue: lowerHigh,
            color: "#ef4444",
          };
        }

        if (tagKey === "double_bottom") {
          const higherLow = Math.max(startBar.low, endBar.low);

          return {
            id: `double-bottom-${segmentIndex}-${tagIndex}`,
            startBar,
            endBar,
            startValue: higherLow,
            endValue: higherLow,
            color: "#22c55e",
          };
        }

        if (tagKey === "expanding_triangle") {
          const highestBar = rangeBars.reduce(
            (highest, bar) => (bar.high > highest.high ? bar : highest),
            startBar,
          );
          const lowestBar = rangeBars.reduce(
            (lowest, bar) => (bar.low < lowest.low ? bar : lowest),
            startBar,
          );

          return [
            {
              id: `expanding-triangle-top-${segmentIndex}-${tagIndex}`,
              startBar,
              endBar: highestBar,
              startValue: startBar.high,
              endValue: highestBar.high,
              color: "#f97316",
            },
            {
              id: `expanding-triangle-bottom-${segmentIndex}-${tagIndex}`,
              startBar,
              endBar: lowestBar,
              startValue: startBar.low,
              endValue: lowestBar.low,
              color: "#f97316",
            },
          ];
        }

        return [];
      });
    });
  }, [bars, segmentTagMarkers]);

  const tradingRangeSegments = useMemo(() => {
    return segmentTagMarkers.flatMap((segment, segmentIndex) => {
      if (!segment.tagKeys.includes("trading_range")) {
        return [];
      }

      const start = Math.min(segment.startBarNumber, segment.endBarNumber);
      const end = Math.max(segment.startBarNumber, segment.endBarNumber);
      const rangeBars = bars.filter(
        (bar) => bar.barNumber >= start && bar.barNumber <= end,
      );
      const startBar = rangeBars[0];
      const endBar = rangeBars[rangeBars.length - 1];

      if (!startBar || !endBar) {
        return [];
      }

      return {
        id: `trading-range-${segmentIndex}`,
        startBar,
        endBar,
        high: Math.max(...rangeBars.map((bar) => bar.high)),
        low: Math.min(...rangeBars.map((bar) => bar.low)),
      };
    });
  }, [bars, segmentTagMarkers]);

  const updateTradingRangeOverlays = useCallback(() => {
    const chart = chartRef.current;
    const series = candleSeriesRef.current;

    if (!chart || !series || !showSavedMarkers) {
      setTradingRangeOverlays([]);
      return;
    }

    const halfBarSpacing = chart.timeScale().options().barSpacing / 2;
    const paneWidth = chart.paneSize().width;
    const nextOverlays = tradingRangeSegments.flatMap((range) => {
      const startX = chart.timeScale().timeToCoordinate(
        range.startBar.time as UTCTimestamp,
      );
      const endX = chart.timeScale().timeToCoordinate(
        range.endBar.time as UTCTimestamp,
      );
      const topY = series.priceToCoordinate(range.high);
      const bottomY = series.priceToCoordinate(range.low);

      if (
        startX === null ||
        endX === null ||
        topY === null ||
        bottomY === null
      ) {
        return [];
      }

      const left = Math.max(Math.min(startX, endX) - halfBarSpacing, 0);
      const right = Math.min(Math.max(startX, endX) + halfBarSpacing, paneWidth);
      const top = Math.min(topY, bottomY);
      const bottom = Math.max(topY, bottomY);

      if (right <= 0 || left >= paneWidth || right <= left) {
        return [];
      }

      return {
        id: range.id,
        left,
        top,
        width: Math.max(right - left, 1),
        height: Math.max(bottom - top, 1),
      };
    });

    setTradingRangeOverlays(nextOverlays);
  }, [showSavedMarkers, tradingRangeSegments]);

  const scheduleTradingRangeOverlayUpdate = useCallback(() => {
    requestAnimationFrame(() => {
      updateTradingRangeOverlays();
      requestAnimationFrame(updateTradingRangeOverlays);
    });
  }, [updateTradingRangeOverlays]);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "#ffffff" },
        textColor: "#3f3f46",
      },
      grid: {
        vertLines: { color: "#e4e4e7" },
        horzLines: { color: "#e4e4e7" },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: "#d4d4d8",
      },
      rightPriceScale: { borderColor: "#d4d4d8" },
      crosshair: {
        vertLine: { color: "#a1a1aa" },
        horzLine: { color: "#a1a1aa" },
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
    candleSeriesRef.current = series;

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
    setChartReadyToken((token) => token + 1);

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
      candleSeriesRef.current = null;
      annotationLineSeriesRef.current = [];
      setTradingRangeOverlays([]);
      chart.remove();
      chartRef.current = null;
    };
  }, [bars, barsByTime, onSelectBar]);

  useEffect(() => {
    const chart = chartRef.current;
    const container = containerRef.current;
    if (!chart || !container) return;

    scheduleTradingRangeOverlayUpdate();

    function handleVisibleRangeChange() {
      scheduleTradingRangeOverlayUpdate();
    }

    const resizeObserver = new ResizeObserver(scheduleTradingRangeOverlayUpdate);
    resizeObserver.observe(container);
    chart
      .timeScale()
      .subscribeVisibleLogicalRangeChange(handleVisibleRangeChange);

    return () => {
      resizeObserver.disconnect();
      chart
        .timeScale()
        .unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
    };
  }, [chartReadyToken, scheduleTradingRangeOverlayUpdate]);

  useEffect(() => {
    const markerApi = selectedMarkerRef.current;
    if (!markerApi) return;

    const markers: SeriesMarker<Time>[] = [];

    if (showSavedMarkers) {
      const barMarkers: SeriesMarker<Time>[] = labeledBars.flatMap(
        ({ bar, longEntryCount, shortEntryCount }) => {
          const markersForBar: SeriesMarker<Time>[] = [];

          if (longEntryCount > 0) {
            markersForBar.push({
              id: `long-entry-bar-${bar.id}`,
              time: bar.time as UTCTimestamp,
              position: "belowBar",
              shape: "arrowUp",
              color: "#22c55e",
              size: 1,
            });
          }

          if (shortEntryCount > 0) {
            markersForBar.push({
              id: `short-entry-bar-${bar.id}`,
              time: bar.time as UTCTimestamp,
              position: "aboveBar",
              shape: "arrowDown",
              color: "#ef4444",
              size: 1,
            });
          }

          return markersForBar;
        },
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

      markers.push(...barMarkers, ...barNumberMarkers);
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
    chartReadyToken,
    labeledBars,
    numberedBars,
    selectedBar,
    selectedRangeBars,
    showSavedMarkers,
  ]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    removeWedgeSeries(chart, annotationLineSeriesRef.current);
    annotationLineSeriesRef.current = [];

    if (!showSavedMarkers) {
      return;
    }

    for (const line of annotationLines) {
      const series = chart.addSeries(LineSeries, {
        color: line.color,
        lineStyle: LineStyle.Dotted,
        lineWidth: 2,
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: false,
      });
      const data: LineData[] = [
        {
          time: line.startBar.time as UTCTimestamp,
          value: line.startValue,
        },
        {
          time: line.endBar.time as UTCTimestamp,
          value: line.endValue,
        },
      ];

      series.setData(data);
      annotationLineSeriesRef.current.push(series);
    }

    return () => {
      removeWedgeSeries(chartRef.current, annotationLineSeriesRef.current);
      annotationLineSeriesRef.current = [];
    };
  }, [annotationLines, chartReadyToken, showSavedMarkers]);

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
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div ref={containerRef} className="absolute inset-0" />
        <div className="pointer-events-none absolute inset-0 z-10">
          {tradingRangeOverlays.map((overlay) => (
            <div
              key={overlay.id}
              className="absolute bg-blue-700/[0.08] dark:bg-blue-400/[0.10]"
              style={{
                left: overlay.left,
                top: overlay.top,
                width: overlay.width,
                height: overlay.height,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
