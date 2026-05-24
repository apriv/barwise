import { readFile } from "node:fs/promises";
import path from "node:path";

export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
};

const SAMPLE_CSV = path.join(process.cwd(), "data", "samples", "es_5m.csv");

export async function readSampleCandles(): Promise<Candle[]> {
  const raw = await readFile(SAMPLE_CSV, "utf8");
  const lines = raw.split("\n");
  const header = lines[0]?.split(",") ?? [];
  const idx = {
    datetime: header.indexOf("datetime"),
    open: header.indexOf("open"),
    high: header.indexOf("high"),
    low: header.indexOf("low"),
    close: header.indexOf("close"),
    volume: header.indexOf("volume"),
  };
  if (idx.datetime < 0 || idx.open < 0) {
    throw new Error(`Unexpected CSV header in ${SAMPLE_CSV}: ${lines[0]}`);
  }

  const out: Candle[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const cols = line.split(",");
    const t = Date.parse(cols[idx.datetime]);
    if (Number.isNaN(t)) continue;
    out.push({
      time: Math.floor(t / 1000),
      open: Number(cols[idx.open]),
      high: Number(cols[idx.high]),
      low: Number(cols[idx.low]),
      close: Number(cols[idx.close]),
      volume: idx.volume >= 0 && cols[idx.volume] ? Number(cols[idx.volume]) : null,
    });
  }
  return out;
}
