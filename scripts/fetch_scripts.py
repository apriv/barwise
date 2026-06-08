#!/usr/bin/env -S uv run --quiet
# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "yt-dlp",
# ]
# ///
"""Download YouTube subtitles for Brooks Trading Course ES daily reviews.

The filter intentionally matches only videos whose titles look like:

    S&P500 E-mini Small Pullback Bear Trend - June 5, 2026
    S&P 500 E mini Horizontal Trading Range with Wide Swings   May 22, 2026

It downloads subtitles only; video/audio files are skipped.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from typing import Any

from yt_dlp import YoutubeDL

CHANNEL_URL = "https://www.youtube.com/@BrooksTradingCourse/videos"
OUT_DIR = Path(__file__).resolve().parent.parent / "data" / "youtube_subtitles" / "brooks_trading_course"

MONTH_RE = (
    r"January|February|March|April|May|June|July|August|"
    r"September|October|November|December"
)
SP500_RE = re.compile(r"\bs\s*&\s*p\s*500\b|\bs&p500\b", re.IGNORECASE)
EMINI_RE = re.compile(r"\be\s*[- ]?\s*mini\b", re.IGNORECASE)
DATE_RE = re.compile(rf"\b(?:{MONTH_RE})\s+\d{{1,2}},\s+\d{{4}}\b", re.IGNORECASE)


def is_sp500_emini_daily_review(title: str | None) -> bool:
    """Return True for Brooks titles that appear to be ES daily reviews."""
    if not title:
        return False
    return bool(SP500_RE.search(title) and EMINI_RE.search(title) and DATE_RE.search(title))


def title_filter(info: dict[str, Any], *, incomplete: bool) -> str | None:
    """yt-dlp match_filter: return a reason string to reject an entry."""
    if info.get("_type") in {"playlist", "multi_video"} or "entries" in info:
        return None

    title = info.get("title")
    if title is None:
        return None

    if is_sp500_emini_daily_review(title):
        return None
    return f"not an S&P500 E-mini dated daily review: {title!r}"


def build_options(args: argparse.Namespace) -> dict[str, Any]:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    return {
        "skip_download": True,
        "writesubtitles": True,
        "writeautomaticsub": args.write_auto_sub,
        "subtitleslangs": args.lang,
        "subtitlesformat": args.format,
        "ignoreerrors": True,
        "continuedl": True,
        "noplaylist": False,
        "playlistend": args.limit,
        "match_filter": title_filter,
        "download_archive": str(OUT_DIR / "downloaded.txt"),
        "outtmpl": {
            "default": str(OUT_DIR / "%(upload_date)s - %(title).180B [%(id)s].%(ext)s"),
        },
    }


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Download subtitles for Brooks Trading Course S&P500 E-mini daily review videos."
    )
    parser.add_argument(
        "url",
        nargs="?",
        default=CHANNEL_URL,
        help=f"YouTube channel/playlist/video URL. Default: {CHANNEL_URL}",
    )
    parser.add_argument(
        "--lang",
        action="append",
        default=None,
        help=(
            "Subtitle language code. Can be repeated. "
            "Default asks yt-dlp for English variants: en, en-US, en.*"
        ),
    )
    parser.add_argument(
        "--format",
        default="vtt/srt/best",
        help="Subtitle format preference passed to yt-dlp. Default: vtt/srt/best",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Only scan the first N videos from the channel/playlist.",
    )
    parser.add_argument(
        "--no-auto-sub",
        dest="write_auto_sub",
        action="store_false",
        help="Do not download auto-generated captions when manual subtitles are absent.",
    )
    parser.add_argument(
        "--list-matches",
        action="store_true",
        help="List matching video titles without downloading subtitles.",
    )
    parser.set_defaults(write_auto_sub=True)

    args = parser.parse_args(argv)
    if args.lang is None:
        args.lang = ["en", "en-US", "en.*"]
    return args


def list_matches(args: argparse.Namespace) -> int:
    ydl_opts = {
        "extract_flat": "in_playlist",
        "ignoreerrors": True,
        "quiet": True,
        "playlistend": args.limit,
    }
    with YoutubeDL(ydl_opts) as ydl:
        playlist = ydl.extract_info(args.url, download=False)

    entries = playlist.get("entries", []) if playlist else []
    matches = [entry for entry in entries if is_sp500_emini_daily_review(entry.get("title"))]
    for entry in matches:
        video_id = entry.get("id", "")
        title = entry.get("title", "")
        print(f"{video_id}\t{title}")
    print(f"Matched {len(matches)} of {len(entries)} scanned videos.")
    return 0


def main(argv: list[str] | None = None) -> int:
    args = parse_args(sys.argv[1:] if argv is None else argv)

    if args.list_matches:
        return list_matches(args)

    print(f"Scanning: {args.url}")
    print(f"Saving subtitles to: {OUT_DIR}")
    print("Filter: title contains S&P500/S&P 500, E-mini/E mini, and a Month D, YYYY date")

    with YoutubeDL(build_options(args)) as ydl:
        result = ydl.download([args.url])
    return int(result)


if __name__ == "__main__":
    sys.exit(main())
