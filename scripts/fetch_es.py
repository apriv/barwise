#!/usr/bin/env -S uv run --quiet
# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "yfinance>=0.2.40",
#   "pandas>=2.0",
# ]
# ///
"""Fetch ES=F 5min bars from yfinance and append to a persistent CSV.

yfinance only serves the last ~60 days of 5min data, so this script is meant to
be run regularly (e.g. weekly) to accumulate history beyond that 60-day window.

Behavior:
- Pulls the maximum available 5min window for ES=F (period=60d).
- Reads the existing CSV (if any) and merges by timestamp, dropping duplicates.
- Writes the union back, sorted ascending by timestamp.
- Prints a summary: new rows, total rows, date span.

CSV schema (UTC ISO datetime, no timezone offset in column — UTC is implied):
    datetime,open,high,low,close,volume
"""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd
import yfinance as yf

SYMBOL = "ES=F"
INTERVAL = "5m"
PERIOD = "60d"
OUT_PATH = Path(__file__).resolve().parent.parent / "data" / "samples" / "es_5m.csv"


def fetch() -> pd.DataFrame:
    df = yf.download(
        SYMBOL,
        period=PERIOD,
        interval=INTERVAL,
        auto_adjust=False,
        progress=False,
    )
    if df.empty:
        raise SystemExit(f"yfinance returned no data for {SYMBOL} {INTERVAL} {PERIOD}")

    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    if df.index.name is None:
        df.index.name = "Datetime"
    df = df.reset_index()
    ts_col = "Datetime" if "Datetime" in df.columns else "Date"
    df = df.rename(
        columns={
            ts_col: "datetime",
            "Open": "open",
            "High": "high",
            "Low": "low",
            "Close": "close",
            "Volume": "volume",
        }
    )
    df["datetime"] = pd.to_datetime(df["datetime"], utc=True)
    df = df[["datetime", "open", "high", "low", "close", "volume"]]
    df = df.dropna(subset=["open", "high", "low", "close"])
    return df


def merge_with_existing(new_df: pd.DataFrame) -> tuple[pd.DataFrame, int]:
    if OUT_PATH.exists():
        old = pd.read_csv(OUT_PATH, parse_dates=["datetime"])
        old["datetime"] = pd.to_datetime(old["datetime"], utc=True)
        before = len(old)
        merged = (
            pd.concat([old, new_df], ignore_index=True)
            .drop_duplicates(subset=["datetime"], keep="last")
            .sort_values("datetime")
            .reset_index(drop=True)
        )
        return merged, len(merged) - before
    return new_df.sort_values("datetime").reset_index(drop=True), len(new_df)


def main() -> int:
    print(f"Fetching {SYMBOL} {INTERVAL} period={PERIOD} from yfinance...")
    new_df = fetch()
    print(f"  got {len(new_df)} rows, range {new_df['datetime'].min()} → {new_df['datetime'].max()}")

    merged, added = merge_with_existing(new_df)
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    merged.to_csv(OUT_PATH, index=False)

    print(
        f"Wrote {OUT_PATH.relative_to(Path.cwd()) if OUT_PATH.is_relative_to(Path.cwd()) else OUT_PATH}: "
        f"+{added} new, {len(merged)} total, "
        f"{merged['datetime'].min()} → {merged['datetime'].max()}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
