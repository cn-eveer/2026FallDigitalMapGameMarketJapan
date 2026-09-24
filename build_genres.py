#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Re-attach the game-list filter columns to GAME_DETAIL_ROWS in js/data.js.

build_detail_rows.py writes the 10 scraped columns; js/app.js reads six more
that the original (lost) build_genres.py used to append:

  [10] time_bucket  fast / light / heavy   -- ゲーム一覧のプレイ時間チップ
  [11] genre1       GAME_TAXONOMY のジャンル -- ジャンルチップ
  [12] genre2       同上（2つ目、無ければ ""）
  [13] playerTags   solo|duo|party         -- 現在 UI では未使用
  [14] form         対戦 / 協力 / チーム戦   -- 同上
  [15] expansion    "1" / ""               -- 同上（由来不明のため引き継ぎのみ）

10, 13, 14 are recomputed from the scraped fields; the rules below were
reverse-engineered from the previous js/data.js and reproduce it exactly
(5224 行で不一致 0〜1 件）。

11, 12 and 15 cannot be recomputed -- the original classifier is gone and the
labels are semantic, not keyword matches (ジャンル名が本文に出てくるのは 12%
だけ). They are therefore carried over from the current js/data.js, keyed on
the game URL, which is stable across scrapes. Games that are new since the
last scrape keep empty genres and are reported at the end so they can be
labelled by hand.

Run it after build_detail_rows.py:

  python3 build_detail_rows.py --prefix gm2026a_all
  python3 build_genres.py
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

ROW_PAT = re.compile(r"var\s+GAME_DETAIL_ROWS\s*=\s*(\[.*?\]);", re.S)
BASE_COLS = 10
FULL_COLS = 16
MODES = ("対戦", "協力", "チーム戦")


def read_rows(js: str) -> list[list]:
    m = ROW_PAT.search(js)
    if not m:
        raise SystemExit("GAME_DETAIL_ROWS not found in data.js")
    return json.loads(m.group(1))


def numbers(text: str) -> list[int]:
    return [int(n) for n in re.findall(r"\d+", text or "")]


def time_bucket(play_time: str) -> str:
    """'20-20' -> fast, '60-60' -> light, '20-190' -> heavy, '-' -> ''."""
    n = numbers(play_time)
    if not n:
        return ""
    longest = max(n)
    if longest <= 30:
        return "fast"
    return "light" if longest <= 60 else "heavy"


def player_bucket(players: str) -> str:
    """'1-4' -> solo|duo, '3-6' -> party, '6' -> '' (単一値は付けない)."""
    if "-" not in (players or ""):
        return ""
    n = numbers(players)
    if not n:
        return ""
    lo = n[0]
    hi = n[1] if len(n) > 1 and n[1] > 0 else lo
    if hi < lo:  # '2-1' のような逆転した範囲は判定しない
        return ""
    out = []
    if lo <= 1 <= hi:
        out.append("solo")
    if lo <= 2 <= hi:
        out.append("duo")
    if hi >= 5:
        out.append("party")
    return "|".join(out)


def mode_of(tags: str) -> str:
    for m in MODES:
        if m in (tags or ""):
            return m
    return ""


def enrich(rows: list[list], carry: dict[str, list]) -> tuple[list[list], list[list]]:
    """Returns the enriched rows, plus the rows whose URL is new since the last
    scrape -- those are the ones that never had a genre and need labelling."""
    out, fresh = [], []
    for r in rows:
        r = list(r)[:BASE_COLS]
        r += [""] * (FULL_COLS - len(r))
        seen = r[9] in carry
        prev = carry.get(r[9], ["", "", ""])
        r[10] = time_bucket(r[5])
        r[11], r[12] = prev[0], prev[1]
        r[13] = player_bucket(r[4])
        r[14] = mode_of(r[7])
        r[15] = prev[2]
        if not seen:
            fresh.append(r)
        out.append(r)
    return out, fresh


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data-js", default="js/data.js")
    ap.add_argument(
        "--carry-from",
        help="ジャンルの引き継ぎ元 data.js（既定: --data-js 自身の現在の内容）",
    )
    ap.add_argument("--report", help="前回スクレイプ以降に増えたゲームを書き出す JSON")
    args = ap.parse_args()

    data_js = Path(args.data_js)
    js = data_js.read_text(encoding="utf-8")
    rows = read_rows(js)

    carry_js = Path(args.carry_from).read_text(encoding="utf-8") if args.carry_from else js
    carry: dict[str, list] = {}
    for r in read_rows(carry_js):
        if len(r) >= FULL_COLS and r[9]:
            carry[r[9]] = [r[11], r[12], r[15]]

    enriched, fresh = enrich(rows, carry)
    value = "[" + ",".join(
        json.dumps(r, ensure_ascii=False, separators=(",", ":")) for r in enriched
    ) + "]"
    data_js.write_text(ROW_PAT.sub(lambda _m: f"var GAME_DETAIL_ROWS={value};", js, count=1), encoding="utf-8")

    with_genre = sum(1 for r in enriched if r[11])
    with_time = sum(1 for r in enriched if r[10])
    print(f"Wrote: {data_js}")
    print(f"Game rows: {len(enriched)}")
    print(f"  time_bucket: {with_time}")
    print(f"  genre (carried over): {with_genre}")
    print(f"  no genre at all: {len(enriched) - with_genre}")
    print(f"  new since last scrape: {len(fresh)} (うち未ラベル {sum(1 for r in fresh if not r[11])})")

    if args.report:
        Path(args.report).write_text(
            json.dumps(
                [{"place": r[0], "title": r[1], "desc": r[2], "url": r[9]} for r in fresh],
                ensure_ascii=False,
                indent=1,
            ),
            encoding="utf-8",
        )
        print(f"Wrote: {args.report}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
