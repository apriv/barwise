import { EsChart } from "@/components/chart/EsChart";
import { readSampleCandles } from "@/lib/sample-data";

export const metadata = {
  title: "Demo · BarWise",
};

export default async function DemoPage() {
  const candles = await readSampleCandles();
  const first = candles[0];
  const last = candles[candles.length - 1];

  const fmt = (ts: number) =>
    new Date(ts * 1000).toISOString().replace("T", " ").slice(0, 16) + " UTC";

  return (
    <>
      <div className="flex items-baseline justify-between border-b border-zinc-800 px-6 py-3">
        <div className="flex items-baseline gap-3">
          <span className="text-sm text-zinc-400">ES=F · 5min · sample CSV</span>
        </div>
        <div className="font-mono text-xs text-zinc-500">
          {candles.length.toLocaleString()} bars · {first ? fmt(first.time) : "—"} →{" "}
          {last ? fmt(last.time) : "—"}
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <EsChart candles={candles} />
      </div>
    </>
  );
}
