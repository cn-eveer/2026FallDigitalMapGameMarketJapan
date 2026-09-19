# ゲムマ2026秋 デジタルマップ

ゲームマーケット2026秋（`target_gm=2026a`）のブースを検索・確認できるデジタルマップです。

ブースごとにメモ、お気に入り、訪問済み、もう一度行く、気になるゲームを保存できます。
保存データはブラウザの `localStorage` に保存されます。

---

## できること

- 地図上のブースをタップして詳細を表示
- ブース検索（ブース番号・サークル名）／ゲーム検索の切り替え
- **ブース概要**の表示（ゲームマーケット公式サイトのブースページから取得）
- **ゲーム一覧**の表示（タイトル・価格・人数・プレイ時間・対象年齢・タグ・出版元・公式リンク）
- 気になるゲームの ★ 登録、お気に入り／行った／もう一度リスト
- `?booth=G12` のようなクエリで特定ブースを直接開く（共有用URL）

---

## ファイル構成

```text
/
├── index.html                          # 画面本体（地図SVG＋UI）
├── manifest.webmanifest
├── sw.js                               # Service Worker（オフラインキャッシュ）
├── css/
│   └── styles.css
├── js/
│   ├── data.js                         # 地図・ブース・概要・ゲームのデータ
│   └── app.js                          # 描画・検索・保存ロジック
├── map_index.json                      # 地図上のブース座標
├── gamemarket_2026a_booth_list.csv     # 2026秋のブース一覧（スクレイプ結果）
├── gamemarket_2026a_booth_list.json
├── gm2026a_all_booths_only.csv/.json   # ブース概要つきブースデータ
├── gm2026a_all_games_only.csv/.json    # ゲーム一覧データ
├── scrape_gamemarket_booth_list.py     # ① ブース一覧を取得
├── scrape_gamemarket_booths.py         # ② ブース概要・ゲーム一覧を取得
├── build_detail_rows.py                # ③ ②の結果を js/data.js に取り込む
└── docs/
    └── README_scrape_gamemarket_separated.md
```

`js/data.js` が持つデータ（`app.js` が参照する形）:

| 変数 | 内容 | 列 |
| --- | --- | --- |
| `booths` | 地図上のブース図形 | 座標・行・番号など |
| `BOOTH_INFO_ROWS` | ブース番号とサークル名の対応 | `[place, name, cat, sub, url, gamesUrl]` |
| `BOOTH_DETAIL_ROWS` | **ブース概要** | `[place, name, url, gamesUrl, overview, gamesCount]` |
| `GAME_DETAIL_ROWS` | **ゲーム一覧** | `[place, title, description, price, players, time, age, tags, publisher, url]` |

`place` は `土-H088` / `両-A001` / `エリア01` / `特設01` の表記で、`app.js` の
`infoKeyVariantsFromPlace()` が地図上のブースと突き合わせます。

---

## 現在のデータ（2026秋）

| 項目 | 件数 |
| --- | --- |
| ブース掲載数（一覧ベース） | 1,427 |
| ユニークなブースページ | 1,425 |
| ブース概要が登録されているブース | 1,031 |
| ゲーム登録があるブース | 852 |
| ゲーム総数 | 5,871 |

内訳: 一般土曜 520 / 一般日曜 328 / 一般両日 470 / エリア 92 / 特設 17

---

## データの更新手順

公式サイト（gamemarket.jp）から取得し直すときは 3 ステップです。
必要なパッケージ: `requests`, `beautifulsoup4`, `lxml`

```bash
# ① 対象イベントのブース一覧を取得（2026a = 2026秋 / 2026s = 2026春）
python3 scrape_gamemarket_booth_list.py --target-gm 2026a \
    --out-prefix gamemarket_2026a

# ② 各ブースページから「ブース概要」と「ゲーム一覧」を取得
#    1,427ブース × 2ページで約30分かかります（--sleep でアクセス間隔を調整）
python3 scrape_gamemarket_booths.py \
    --input gamemarket_2026a_booth_list.csv \
    --start 1 --limit 0 --sleep 0.4 \
    --out-prefix gm2026a_all

# ③ 取得結果を js/data.js に取り込む
python3 build_detail_rows.py --prefix gm2026a_all
```

③ は `js/data.js` の `BOOTH_DETAIL_ROWS` と `GAME_DETAIL_ROWS` だけを置き換えます
（地図データはそのまま）。

途中から再開したいときは `--start` / `--limit` で分割できます（詳細は
`docs/README_scrape_gamemarket_separated.md`）。

データを更新したら、閲覧者のキャッシュを切り替えるために
`index.html` の `ver-2026A-*` と `sw.js` の `CACHE_NAME` も上げてください。

---

## ローカルで動かす

Service Worker と `fetch` の都合で、ファイルを直接開くのではなく HTTP で配信します。

```bash
python3 -m http.server 8000
# http://localhost:8000/
```

---

## 既知の制限

- 日程切り替えボタンは「土 / 両」のみで、日曜限定ブース（`日-` のデータ）は
  土曜のデータが無い場合のフォールバックとしてのみ表示されます。
- 公式サイトに概要を登録していないサークル（約 400 ブース）は
  「概要データ未登録」と表示されます。
- `manifest.webmanifest` が参照する `icon-192.png` はリポジトリに含まれていません。
