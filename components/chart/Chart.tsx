"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CandlestickSeries,
  createChart,
  type IChartApi,
  type MouseEventParams,
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

type ChartProps = {
  bars: ChartBar[];
  onSelectBar?: (bar: ChartBar) => void;
};

function formatPrice(value: number) {
  return value.toFixed(2);
}

export function Chart({ bars, onSelectBar }: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [hoveredBar, setHoveredBar] = useState<ChartBar | null>(bars[0] ?? null);

  const barsByTime = useMemo(() => {
    return new Map(bars.map((bar) => [bar.time, bar]));
  }, [bars]);

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
        onSelectBar?.(bar);
      }
    }

    chart.subscribeCrosshairMove(handleCrosshairMove);
    chart.subscribeClick(handleClick);
    chart.timeScale().fitContent();

    return () => {
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      chart.unsubscribeClick(handleClick);
      chart.remove();
      chartRef.current = null;
    };
  }, [bars, barsByTime, onSelectBar]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-11 items-center gap-4 border-b border-zinc-800 px-4 font-mono text-xs text-zinc-400">
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
