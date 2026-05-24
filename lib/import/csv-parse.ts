import Papa from "papaparse";
import { z } from "zod";

import { zonedTimeToUnixSeconds } from "@/lib/import/time";

export type ParsedBar = {
  ts: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
  sourceRow: number;
};

export type ParseWarning = {
  row?: number;
  message: string;
};

export type ParseResult = {
  bars: ParsedBar[];
  warnings: ParseWarning[];
  columns: Record<"datetime" | "open" | "high" | "low" | "close", string> & {
    volume?: string;
  };
};

const parseOptionsSchema = z.object({
  sourceTimezone: z.string().min(1).default("America/Chicago"),
});

const requiredColumns = ["datetime", "open", "high", "low", "close"] as const;

type RawRow = Record<string, unknown>;

function normalizeColumnName(name: string) {
  return name.trim().toLowerCase();
}

function findColumns(fields: string[]) {
  const byNormalizedName = new Map(
    fields.map((field) => [normalizeColumnName(field), field]),
  );

  const columns = Object.fromEntries(
    requiredColumns.map((column) => [column, byNormalizedName.get(column)]),
  ) as Partial<ParseResult["columns"]>;

  const missing = requiredColumns.filter((column) => !columns[column]);
  if (missing.length > 0) {
    throw new Error(`Missing required CSV columns: ${missing.join(", ")}`);
  }

  const volume = byNormalizedName.get("volume");
  if (volume) {
    columns.volume = volume;
  }

  return columns as ParseResult["columns"];
}

function parseNumber(value: unknown, label: string, row: number) {
  const numericValue =
    typeof value === "string" ? Number(value.trim()) : Number(value);

  if (!Number.isFinite(numericValue)) {
    throw new Error(`Row ${row}: ${label} must be a number`);
  }

  return numericValue;
}

function parseVolume(value: unknown, row: number) {
  if (value == null || value === "") {
    return null;
  }

  const volume = parseNumber(value, "volume", row);
  if (!Number.isInteger(volume) || volume < 0) {
    throw new Error(`Row ${row}: volume must be a non-negative integer`);
  }

  return volume;
}

function parseTimestamp(value: unknown, sourceTimezone: string, row: number) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Row ${row}: datetime is required`);
  }

  const raw = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new Error(`Row ${row}: datetime must include a time`);
  }

  if (/(Z|[+-]\d{2}:?\d{2})$/.test(raw)) {
    const millis = Date.parse(raw);
    if (Number.isNaN(millis)) {
      throw new Error(`Row ${row}: datetime is invalid`);
    }
    return Math.floor(millis / 1000);
  }

  const match = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/,
  );

  if (!match) {
    throw new Error(`Row ${row}: datetime format is not supported`);
  }

  return zonedTimeToUnixSeconds(
    {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
      hour: Number(match[4]),
      minute: Number(match[5]),
      second: Number(match[6] ?? 0),
    },
    sourceTimezone,
  );
}

function assertOhlc(bar: ParsedBar) {
  if (bar.low > bar.open || bar.low > bar.close) {
    throw new Error(`Row ${bar.sourceRow}: low must be <= open and close`);
  }

  if (bar.high < bar.open || bar.high < bar.close) {
    throw new Error(`Row ${bar.sourceRow}: high must be >= open and close`);
  }

  if (bar.low > bar.high) {
    throw new Error(`Row ${bar.sourceRow}: low must be <= high`);
  }
}

function validateIntervals(bars: ParsedBar[]) {
  const warnings: ParseWarning[] = [];

  for (let i = 1; i < bars.length; i++) {
    const previous = bars[i - 1];
    const current = bars[i];
    const delta = current.ts - previous.ts;

    if (delta < 0) {
      throw new Error(
        `Row ${current.sourceRow}: datetime must be monotonic increasing`,
      );
    }

    if (delta === 0) {
      warnings.push({
        row: current.sourceRow,
        message: "Duplicate timestamp; import will skip an existing bar.",
      });
      continue;
    }

    if (delta % 300 !== 0) {
      warnings.push({
        row: current.sourceRow,
        message: `Timestamp is ${delta} seconds after previous row, not a 5-minute multiple.`,
      });
    }
  }

  return warnings;
}

export function parseCsvBars(
  csv: string,
  options?: z.input<typeof parseOptionsSchema>,
): ParseResult {
  const { sourceTimezone } = parseOptionsSchema.parse(options ?? {});
  const parsed = Papa.parse<RawRow>(csv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors.length > 0) {
    const firstError = parsed.errors[0];
    throw new Error(
      `CSV parse error on row ${firstError.row ?? "unknown"}: ${firstError.message}`,
    );
  }

  const columns = findColumns(parsed.meta.fields ?? []);
  const bars = parsed.data.map((row, index) => {
    const sourceRow = index + 2;
    const bar = {
      ts: parseTimestamp(row[columns.datetime], sourceTimezone, sourceRow),
      open: parseNumber(row[columns.open], "open", sourceRow),
      high: parseNumber(row[columns.high], "high", sourceRow),
      low: parseNumber(row[columns.low], "low", sourceRow),
      close: parseNumber(row[columns.close], "close", sourceRow),
      volume: columns.volume
        ? parseVolume(row[columns.volume], sourceRow)
        : null,
      sourceRow,
    };

    assertOhlc(bar);
    return bar;
  });

  const sortedBars = [...bars].sort((a, b) => a.ts - b.ts);
  const sortedWarnings =
    bars.some((bar, index) => bar.ts !== sortedBars[index]?.ts)
      ? [
          {
            message:
              "Rows were sorted by datetime before session building.",
          },
        ]
      : [];

  return {
    bars: sortedBars,
    warnings: [...sortedWarnings, ...validateIntervals(sortedBars)],
    columns,
  };
}
