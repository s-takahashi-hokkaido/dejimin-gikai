---
name: update-press-conferences
description: 市長記者会見データの更新手順（札幌市）。市の公式な記者会見記録を基に発表項目・質疑応答を構造化して press_conferences に取り込む際に必ず参照すること。
---

# 記者会見データ更新（press_conferences / items / turns）

札幌市長の記者会見を「発表項目（announcement）」と「質疑応答（qa）」に構造化してDBに取り込む。

> 福岡市版（upstream）の同名スキルを札幌市向けに書き換えたもの。福岡市版は YouTube の自動字幕を一次ソースにしていたが、札幌市は**市が整理済みの全文記録を公開している**ので、それを一次ソースにする。

## 取り込む前に直すこと（web の表示）

web の記者会見画面には、福岡市長の名前がハードコードされている。**札幌市のデータを公開する前に、別の PR で直す**こと。

- `web/src/features/press-conferences/client/components/turn-bubble.tsx`（市長の発言ラベルが「高島市長」）
- `web/src/features/press-conferences/client/components/press-conference-list.tsx`
- `web/src/features/press-conferences/client/components/press-conference-archive-section.tsx`
- `web/src/features/press-conferences/client/components/press-conference-detail.tsx`

`turns.speaker_name` は画面に表示されていない（ラベルは `speaker` から「高島市長」か「記者」を出し分けているだけ）。

## データソース

| 用途 | URL |
|---|---|
| 記者会見トップ（次回日程・最新の記録） | https://www.city.sapporo.jp/city/mayor/interview/index.html |
| 年度別の記録一覧 | `https://www.city.sapporo.jp/city/mayor/interview/r8.html`（令和8年度。`r7.html` 以前も同じ形） |
| 会見記録 | `https://www.city.sapporo.jp/city/mayor/interview/text/{西暦}/{月日4桁}.html`（例: `text/2026/0901.html`）。URLは一覧のリンクから取る |
| LIVE配信 | https://www.city.sapporo.jp/city/mayor/interview/live.html |

- 動画（YouTube）は会見当日中に、記録は「重複した言葉遣いや明らかな言い直しなどを整理した上で」**会見の翌開庁日の夕方まで**に掲載される（市の記者会見トップの記載）
- 定例会見のほかに臨時会見もある（例: 「令和5年9月15日臨時市長記者会見記録」）
- アクセスは1件ずつ、1〜2秒の間隔を置く

### 会見記録ページの構成

冒頭に日時・場所・記者数があり、そのあとに次の順で並ぶ。

1. 「市長から下記の話題について発表しました」: 発表項目の見出し一覧（ページ内リンク `#h01`, `#h02`, …）
2. 配布資料（PDF）
3. 動画: `https://youtu.be/…` へのリンク
4. 「引き続き、次の話題について質疑が行われました」: 質疑の見出し一覧（`#s01`, `#s02`, …）
5. 「発表内容」: `<h3><a id="h01">見出し</a></h3>` のあとに本文の `<p>`
6. 「質疑応答」: `<h3><a id="s01">見出し</a></h3>` のあとに、`<h4>共同通信</h4><p>質問</p><h4>市長</h4><p>答え</p>` の繰り返し

質疑の `<h4>` は報道機関名（共同通信・北海道新聞など）か「市長」。同じ話題が「副首都構想について（1）」「（2）」…のように分かれ、別の話題をはさんで何度も出てくることがある。

## DBマッピング

### press_conferences

| フィールド | 内容 |
|---|---|
| `slug` | 開催日 `YYYY-MM-DD`。同じ日に定例と臨時の会見が重なったときの付け方はユーザーに確認する |
| `title` | 公式の名称から「記録」を除いたもの（例: 「令和8年度第9回定例市長記者会見」） |
| `held_at` | 開催日 |
| `youtube_url` | 会見記録ページにある動画リンク |
| `status` | 登録時は `draft`（既定値）、確認後に `published`。**web は `published` だけを表示する**。ほかに `structuring` / `review` / `error` も取れる |

### press_conference_items（会見内の項目）

- `item_type`: 発表項目（`#hNN`）は `announcement`、質疑（`#sNN`）は `qa`
- `order_index`: 会見内の登場順（発表 → 質疑の順。質疑は公式記録の並びのまま）
- `title`: 公式の見出しを基本にする。市民向けに言い換える場合は、見出しにある語を変えない
- `summary`: announcement は発表内容の要約を必ず入れる。qa は null でもよい（turns で表す）
- 「（1）」「（2）」と分かれた同じ話題をまとめるかどうかはユーザーに確認する（まとめると発言の順序が変わる）

### press_conference_turns（発言単位）

- announcement は turns を作らない（summary だけ）
- qa は `speaker`（`reporter` / `mayor`）、`speaker_name`（記者は報道機関名、市長は null）、`content`、`order_index` で往復を表す
- `content` は公式記録の本文をそのまま使うのを基本にする。要約する場合は、方針をユーザーと決めてから行う

## 手順

1. 年度別の一覧から、取り込む会見の記録ページを特定する
2. 記録ページを取得し、発表項目と質疑を見出し（`#hNN` / `#sNN`）ごとに分ける
3. 発表項目の summary を作る。質疑の turns を記録どおりに並べる
4. **ユーザーレビュー（必須）**: 生成内容を提示し、承認を得る（CLAUDE.md「AI生成コンテンツのDB更新ルール」。中国語漢字の混入、発言者の取り違えに注意）
5. `draft` で登録する。記者会見には管理画面が無いので、REST または SQL で書き込む。接続は `db-access` スキルの規約に従うが、北海道版の本番DBは未確定（VPS 移行待ち）で `db-access` の記載は福岡市版のまま。**書き込み先は必ずユーザーに確認する**
   - 福岡市版の投入スクリプト（`packages/seed/fukuoka/seed-press-conferences.ts`）は削除済み（`e8f9537`）
6. web の記者会見ページ（`/press-conferences`、`/press-conferences/[slug]`）で表示を確認する
7. 確認後に `status` を `published` にする

## 注意

- 要約では市長の発言のニュアンス（推測か断定か）を変えない。発言していないことを summary に書かない
- 配布資料（PDF）は発表項目の理解の補助に使ってよいが、summary は会見での発言に基づいて書く
