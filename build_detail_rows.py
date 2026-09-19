#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Inject scraped booth overviews (ブース概要) and game lists (ゲーム一覧) into js/data.js.

Input: the *_booths_only.json / *_games_only.json pair written by
scrape_gamemarket_booths.py, which carries booth_number/booth_type through
from the booth list CSV.

Output: js/data.js with BOOTH_DETAIL_ROWS and GAME_DETAIL_ROWS replaced.

Row shapes (must match the readers in js/app.js):
  BOOTH_DETAIL_ROWS: [place, name, url, gamesUrl, overview, gamesCount]
  GAME_DETAIL_ROWS:  [place, title, description, price, players, time, age,
                      tags, publisher, url]

`place` uses the same spelling as BOOTH_INFO_ROWS ("土-H088", "両-A001",
"エリア01", "特設01") so infoKeyVariantsFromPlace() lines the rows up with
the map booths, day switch included.

Usage:
  python build_detail_rows.py --prefix gm2026a_all
  python build_detail_rows.py --booths a_booths_only.json --games a_games_only.json
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

DAY_PREFIX = {"土曜": "土", "日曜": "日", "両日": "両"}


def normalize_place(booth_number: str, booth_type: str = "") -> str:
    """'土曜 - G006' -> '土-G006', 'エリア - 01' -> 'エリア01', '特設01' -> '特設01'."""
    s = str(booth_number or "").replace("　", " ").strip()
    s = re.sub(r"\s*[-ー－]\s*", "-", s)

    m = re.match(r"^(土曜|日曜|両日)-(.+)$", s)
    if m:
        return f"{DAY_PREFIX[m.group(1)]}-{m.group(2).replace(' ', '')}"

    m = re.match(r"^(エリア|特設)-?0*(\d+)$", s)
    if m:
        return f"{m.group(1)}{int(m.group(2)):02d}"

    return s.replace(" ", "")


def js_array(rows: list[list], indent: str = "") -> str:
    return "[" + ",".join(json.dumps(r, ensure_ascii=False, separators=(",", ":")) for r in rows) + "]"


def build_rows(booths: list[dict], games: list[dict]) -> tuple[list[list], list[list]]:
    # booth_seq is the listing seq, so each listing keeps its own place even
    # when several listings share one booth page.
    place_by_seq: dict[int, str] = {}
    booth_rows: list[list] = []

    for b in booths:
        seq = int(b.get("seq") or 0)
        place = normalize_place(b.get("booth_number", ""), b.get("booth_type", ""))
        place_by_seq[seq] = place
        booth_rows.append(
            [
                place,
                b.get("booth_name", ""),
                b.get("booth_url", ""),
                b.get("game_list_url", ""),
                b.get("booth_overview", ""),
                int(b.get("games_count") or 0),
            ]
        )

    game_rows: list[list] = []
    for g in games:
        seq = int(g.get("booth_seq") or 0)
        place = place_by_seq.get(seq) or normalize_place(
            g.get("booth_number", ""), g.get("booth_type", "")
        )
        game_rows.append(
            [
                place,
                g.get("game_title", ""),
                g.get("game_description", ""),
                g.get("game_price", ""),
                g.get("game_player", ""),
                g.get("game_play_time", ""),
                g.get("game_target_age", ""),
                g.get("game_tags", ""),
                g.get("game_publisher", ""),
                g.get("game_url", ""),
            ]
        )

    return booth_rows, game_rows


def replace_var(js: str, name: str, value: str) -> str:
    pattern = re.compile(r"var\s+" + re.escape(name) + r"\s*=\s*\[.*?\];", re.S)
    if not pattern.search(js):
        raise SystemExit(f"{name} not found in data.js")
    return pattern.sub(lambda _m: f"var {name}={value};", js, count=1)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--prefix", help="Scrape output prefix, e.g. gm2026a_all")
    ap.add_argument("--booths", help="*_booths_only.json")
    ap.add_argument("--games", help="*_games_only.json")
    ap.add_argument("--data-js", default="js/data.js")
    args = ap.parse_args()

    booths_path = Path(args.booths or f"{args.prefix}_booths_only.json")
    games_path = Path(args.games or f"{args.prefix}_games_only.json")
    if not args.prefix and not (args.booths and args.games):
        raise SystemExit("Provide --prefix or both --booths and --games")

    booths = json.loads(booths_path.read_text(encoding="utf-8"))
    games = json.loads(games_path.read_text(encoding="utf-8"))
    booth_rows, game_rows = build_rows(booths, games)

    data_js = Path(args.data_js)
    js = data_js.read_text(encoding="utf-8")
    js = replace_var(js, "BOOTH_DETAIL_ROWS", js_array(booth_rows))
    js = replace_var(js, "GAME_DETAIL_ROWS", js_array(game_rows))
    data_js.write_text(js, encoding="utf-8")

    with_overview = sum(1 for r in booth_rows if r[4])
    print(f"Wrote: {data_js}")
    print(f"Booth detail rows: {len(booth_rows)} ({with_overview} with ブース概要)")
    print(f"Game detail rows: {len(game_rows)}")
    print(f"data.js size: {data_js.stat().st_size / 1024:.0f} KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
