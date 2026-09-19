#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Game Market booth *list* extractor.

Pulls the full booth index for one event (e.g. 2026 Autumn / target_gm=2026a)
from https://gamemarket.jp/booth and writes a booth list CSV/JSON.

The CSV columns match what scrape_gamemarket_booths.py expects as --input,
so the usual flow is:

  # 1. get the booth list for the event
  python scrape_gamemarket_booth_list.py --target-gm 2026a \
      --out-prefix gamemarket_2026a

  # 2. scrape booth details + games from that list
  python scrape_gamemarket_booths.py \
      --input gamemarket_2026a_booth_list.csv \
      --start 1 --limit 0 \
      --out-prefix gm2026a_all

Notes:
  - The site 500s on absurd page_count values (page_count=1000000 fails),
    so this paginates with a sane --page-count (default 500) and follows
    ?page=N until every booth is collected.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Optional
from urllib.parse import urlencode, urljoin

import requests
from bs4 import BeautifulSoup, Tag

BASE_URL = "https://gamemarket.jp"
BOOTH_INDEX = f"{BASE_URL}/booth"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/125.0 Safari/537.36"
    ),
    "Accept-Language": "ja,en;q=0.8",
}


@dataclass
class BoothListItem:
    seq: int = 0
    booth_name: str = ""
    booth_number: str = ""
    booth_type: str = ""
    booth_tags: str = ""
    booth_url: str = ""
    booth_id: str = ""
    target_gm: str = ""


def clean_text(text: str) -> str:
    if not text:
        return ""
    text = text.replace("\xa0", " ").replace("　", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def absolute_url(href: str) -> str:
    return urljoin(BASE_URL, href or "")


def booth_id_from_url(url: str) -> str:
    m = re.search(r"/booth/(\d+)", url or "")
    return m.group(1) if m else ""


def index_url(target_gm: str, page_count: int, page: int) -> str:
    params = {"target_gm": target_gm, "page_count": page_count}
    if page > 1:
        params["page"] = page
    return f"{BOOTH_INDEX}?{urlencode(params)}"


def fetch(url: str, sleep: float = 0.5, retries: int = 2) -> tuple[Optional[str], str]:
    status = "unknown"
    for attempt in range(retries + 1):
        try:
            r = requests.get(url, headers=HEADERS, timeout=30)
            if r.status_code == 200 and r.text.strip():
                time.sleep(sleep)
                return r.text, "ok"
            status = f"http_{r.status_code}"
        except Exception as e:
            status = f"error:{type(e).__name__}:{e}"

        if attempt < retries:
            time.sleep(sleep * (attempt + 1))

    return None, status


def text_or_blank(parent: Tag, selector: str) -> str:
    el = parent.select_one(selector)
    return clean_text(el.get_text(" ", strip=True)) if el else ""


def extract_total_count(soup: BeautifulSoup) -> Optional[int]:
    """Parse the 'ブース一覧 (1427件)' heading."""
    h = soup.select_one("h3.boothList")
    if not h:
        return None

    m = re.search(r"([\d,]+)\s*件", h.get_text(" ", strip=True))
    return int(m.group(1).replace(",", "")) if m else None


def parse_booth_item(li: Tag, target_gm: str) -> Optional[BoothListItem]:
    a = li.select_one("a[href*='/booth/']")
    if not a:
        return None

    href = a.get("href", "")
    if not re.search(r"/booth/\d+", href):
        return None

    url = absolute_url(href)
    name = clean_text(a.get("title", "")) or text_or_blank(a, "dt.title")
    tags = [clean_text(t.get_text(" ", strip=True)) for t in li.select("ul.eventTag li")]

    return BoothListItem(
        booth_name=name,
        booth_number=text_or_blank(li, "dd.booth-num"),
        booth_type=text_or_blank(li, "dd.booth-type"),
        booth_tags=", ".join(t for t in tags if t),
        booth_url=url,
        booth_id=booth_id_from_url(url),
        target_gm=target_gm,
    )


def parse_index_page(html: str, target_gm: str) -> tuple[list[BoothListItem], Optional[int]]:
    soup = BeautifulSoup(html, "lxml")
    items: list[BoothListItem] = []

    for li in soup.select("ul.archiveList li.itemList-child"):
        booth = parse_booth_item(li, target_gm)
        if booth:
            items.append(booth)

    return items, extract_total_count(soup)


def scrape_booth_list(
    target_gm: str,
    page_count: int = 500,
    sleep: float = 0.5,
    max_pages: int = 100,
) -> list[BoothListItem]:
    booths: list[BoothListItem] = []
    # A booth page can be listed several times (e.g. a 特設 exhibit plus two
    # regular booth numbers), so identity is the listing row, not the URL.
    seen: set[tuple[str, str, str]] = set()
    total: Optional[int] = None

    for page in range(1, max_pages + 1):
        url = index_url(target_gm, page_count, page)
        print(f"[page {page}] FETCH {url}", file=sys.stderr)

        html, status = fetch(url, sleep=sleep)
        if not html:
            print(f"  fetch failed ({status}) — stopping", file=sys.stderr)
            break

        items, page_total = parse_index_page(html, target_gm)
        if total is None and page_total is not None:
            total = page_total
            print(f"  site reports {total} booths for {target_gm}", file=sys.stderr)

        new = 0
        for b in items:
            key = (b.booth_url, b.booth_name, b.booth_number)
            if key in seen:
                continue
            seen.add(key)
            b.seq = len(booths) + 1
            booths.append(b)
            new += 1

        print(f"  parsed {len(items)} items, {new} new (total {len(booths)})", file=sys.stderr)

        if new == 0 or len(items) < page_count:
            break
        if total is not None and len(booths) >= total:
            break

    if total is not None and len(booths) != total:
        print(
            f"WARNING: collected {len(booths)} booths but site reported {total}",
            file=sys.stderr,
        )

    return booths


def write_json(path: Path, data: list[dict]) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def write_csv(path: Path, data: list[dict]) -> None:
    if not data:
        path.write_text("", encoding="utf-8-sig")
        return

    with path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(data[0].keys()))
        writer.writeheader()
        writer.writerows(data)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Extract the Game Market booth list for one event."
    )
    parser.add_argument(
        "--target-gm",
        default="2026a",
        help="Event id used by gamemarket.jp (e.g. 2026a = 2026 Autumn, 2026s = 2026 Spring)",
    )
    parser.add_argument(
        "--page-count",
        type=int,
        default=500,
        help="Booths per request. Very large values make the site return HTTP 500.",
    )
    parser.add_argument("--sleep", type=float, default=0.5)
    parser.add_argument("--max-pages", type=int, default=100)
    parser.add_argument(
        "--out-prefix",
        default=None,
        help="Output prefix (default: gamemarket_<target_gm>)",
    )
    parser.add_argument("--print-extracted", action="store_true")
    args = parser.parse_args()

    booths = scrape_booth_list(
        target_gm=args.target_gm,
        page_count=args.page_count,
        sleep=args.sleep,
        max_pages=args.max_pages,
    )

    if args.print_extracted:
        for b in booths:
            print(
                f"{b.seq}\t{b.booth_number or '未取得'}\t"
                f"{b.booth_type or '未取得'}\t{b.booth_name or '未取得'}\t{b.booth_url}"
            )

    rows = [asdict(b) for b in booths]
    prefix = args.out_prefix or f"gamemarket_{args.target_gm}"

    csv_path = Path(f"{prefix}_booth_list.csv")
    json_path = Path(f"{prefix}_booth_list.json")
    write_csv(csv_path, rows)
    write_json(json_path, rows)

    unique_pages = len({b.booth_url for b in booths})

    print(f"Wrote: {csv_path}")
    print(f"Wrote: {json_path}")
    print(f"Booth listings: {len(rows)}")
    print(f"Unique booth pages: {unique_pages}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
