#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Merge a hand-collected game list (公式X / ボドゲゴー / ブースブログ / 各社サイト)
into GAME_DETAIL_ROWS in js/data.js.

The scrape (build_detail_rows.py) only sees games registered on gamemarket.jp.
This adds the ones it misses: games announced on X or blogs, items listed on
publisher sites, and games registered after the last scrape.

Input CSV columns (data_extra/gm2026a_saturday_games.csv):
  区分,出展日,ブース番号,ブース名,ブースURL,ブースロゴURL,X,ゲーム名,概要,価格,
  プレイ人数,プレイ時間,予約,予約リンク,詳細URL,試遊,新作,情報源,画像URL,画像備考

A row is skipped when its 詳細URL is already in GAME_DETAIL_ROWS, or when the
same booth already has a game with the same title (ignoring brackets, spaces
and punctuation). Rows listed in --exclude (one "place<TAB>title" per line)
are skipped too -- use it for near-duplicates the title match cannot catch.

Genres for the added rows come from --genres (data_extra/genres.tsv, hand
labels keyed by place+title) and, failing that, from --carry-from. Rows still
without a genre are written to --report.

  cp js/data.js /tmp/data_before_extra.js
  python3 merge_extra_games.py --csv data_extra/gm2026a_saturday_games.csv \
      --carry-from /tmp/data_before_extra.js --report new_extra_games.json

Run it after build_detail_rows.py + build_genres.py: those rewrite
GAME_DETAIL_ROWS from the scrape and drop rows added here.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import unicodedata
from pathlib import Path

from build_genres import ROW_PAT, mode_of, player_bucket, read_rows, time_bucket

DAY_PREFIX = {"土曜": "土", "日曜": "日", "両日": "両"}
EXTRA_SECTION = "extra"  # marker in col 15 so a re-run can drop and re-add


def place_of(row: dict) -> str:
    num = row["ブース番号"].strip()
    m = re.fullmatch(r"エリア-?(\d+)", num)
    if m:
        return f"エリア{int(m.group(1)):02d}"
    if row["区分"] == "一般":
        return f"{DAY_PREFIX[row['出展日']]}-{num}"
    return num


def norm_title(s: str) -> str:
    s = unicodedata.normalize("NFKC", s or "").lower()
    return re.sub(r"[\s\[\]【】『』「」（）()・:：!！?？\-ー〜~,、。.…/]", "", s)


def range_of(text: str, unit: str) -> str:
    """'2〜11人' -> '2-11', '5人' -> '5', '〜20分' -> '-20', '人' -> '-'."""
    s = (text or "").replace(unit, "").replace("×1", "").strip()
    s = s.replace("〜", "-").replace("~", "-")
    if not re.search(r"\d", s):
        return "-"
    return s


def price_of(text: str) -> str:
    s = (text or "").strip()
    if not s:
        return ""
    if s.startswith("¥"):
        return s
    n = re.sub(r"[^\d,]", "", s)
    return f"¥{n}" if n else s


def tags_of(row: dict) -> str:
    out = []
    if row["新作"].strip():
        out.append("新作")
    if row["試遊"].strip():
        out.append("試遊あり")
    return ", ".join(out)


def to_game_row(row: dict) -> list:
    players = range_of(row["プレイ人数"], "人")
    play_time = range_of(row["プレイ時間"], "分")
    tags = tags_of(row)
    url = row["詳細URL"].strip()
    return [
        place_of(row),
        f"[{row['ゲーム名'].strip()}]",
        row["概要"].strip(),
        price_of(row["価格"]),
        players,
        play_time,
        "",
        tags,
        row["ブース名"].strip(),
        url,
        time_bucket(play_time),
        "",
        "",
        player_bucket(players),
        mode_of(tags),
        "",
    ]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", default="data_extra/gm2026a_saturday_games.csv")
    ap.add_argument("--data-js", default="js/data.js")
    ap.add_argument("--carry-from", help="ジャンルの引き継ぎ元 data.js")
    ap.add_argument("--exclude", default="data_extra/exclude.tsv")
    ap.add_argument("--genres", default="data_extra/genres.tsv",
                    help="手で付けたジャンル（place<TAB>title<TAB>genre1<TAB>genre2）")
    ap.add_argument("--report", help="ジャンル未設定の追加ゲームを書き出す JSON")
    args = ap.parse_args()

    data_js = Path(args.data_js)
    js = data_js.read_text(encoding="utf-8")
    # Drop rows a previous run added, so re-running is idempotent.
    rows = [r for r in read_rows(js) if not (len(r) > 15 and r[15] == EXTRA_SECTION)]

    carry: dict[tuple, list] = {}
    if args.carry_from:
        for r in read_rows(Path(args.carry_from).read_text(encoding="utf-8")):
            if len(r) > 15 and r[11]:
                carry[(r[0], norm_title(r[1]))] = [r[11], r[12]]

    gp = Path(args.genres)
    if gp.exists():
        for line in gp.read_text(encoding="utf-8").splitlines():
            if line.strip() and not line.startswith("#"):
                cols = (line.split("\t") + ["", "", ""])[:4]
                carry[(cols[0].strip(), norm_title(cols[1]))] = [cols[2].strip(), cols[3].strip()]

    excluded = set()
    ex = Path(args.exclude)
    if ex.exists():
        for line in ex.read_text(encoding="utf-8").splitlines():
            if line.strip() and not line.startswith("#"):
                place, _, title = line.partition("\t")
                excluded.add((place.strip(), norm_title(title)))

    known_urls = {r[9] for r in rows if r[9]}
    known_titles = {(r[0], norm_title(r[1])) for r in rows}

    with open(args.csv, encoding="utf-8-sig", newline="") as f:
        src = list(csv.DictReader(f))

    added, skipped_url, skipped_title, skipped_ex = [], 0, 0, 0
    for s in src:
        g = to_game_row(s)
        key = (g[0], norm_title(g[1]))
        if g[9] and g[9] in known_urls and g[9].startswith("https://gamemarket.jp/game/"):
            skipped_url += 1
            continue
        if key in known_titles:
            skipped_title += 1
            continue
        if key in excluded:
            skipped_ex += 1
            continue
        g[11], g[12] = carry.get(key, ["", ""])
        g[15] = EXTRA_SECTION
        known_titles.add(key)
        if g[9]:
            known_urls.add(g[9])
        added.append(g)

    out = rows + added
    value = "[" + ",".join(json.dumps(r, ensure_ascii=False, separators=(",", ":")) for r in out) + "]"
    data_js.write_text(ROW_PAT.sub(lambda _m: f"var GAME_DETAIL_ROWS={value};", js, count=1), encoding="utf-8")

    print(f"CSV rows: {len(src)}")
    print(f"  already present (URL): {skipped_url}")
    print(f"  already present (title in same booth): {skipped_title}")
    print(f"  excluded: {skipped_ex}")
    print(f"  added: {len(added)} (genre carried: {sum(1 for r in added if r[11])})")
    print(f"Game rows now: {len(out)}")

    if args.report:
        Path(args.report).write_text(
            json.dumps(
                [{"place": r[0], "title": r[1], "desc": r[2], "url": r[9]} for r in added if not r[11]],
                ensure_ascii=False,
                indent=1,
            ),
            encoding="utf-8",
        )
        print(f"Wrote: {args.report}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
