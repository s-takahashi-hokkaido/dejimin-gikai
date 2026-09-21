---
name: update-budget-overview
description: 各局の重点施策（予算概要）データの更新手順（札幌市）。毎年度の当初予算の「局別施策の概要」「主要事業一覧」PDFを要約して budget_overviews / budget_themes / budget_initiatives に取り込む際に必ず参照すること。
---

# 各局重点施策データ更新（budget_overviews / budget_themes / budget_initiatives）

札幌市が毎年度公開する当初予算の資料から、局ごとの予算と主要事業を抜き出し、`/budget` 配下の重点施策ページ用のデータにする。

> 福岡市版（upstream）の同名スキルを札幌市向けに書き換えたもの。福岡市は18局分のPDFが局ごとに分かれていたが、札幌市は**全局分が1本のPDF**にまとまっており、資料の構成も違う。

## データソース

- 予算・決算トップ: https://www.city.sapporo.jp/zaisei/kohyo/yosan-kessan/index.html
- 年度別ページ（令和8年度の例）: https://www.city.sapporo.jp/zaisei/kohyo/yosan-kessan/r8/reiwa8nendo_yosan.html
  - 令和7年度は `r7/reiwa7nendo_yosan.html`。年度ごとにURLが変わるので、トップから辿る
- アクセスは1件ずつ、1〜2秒の間隔を置く

年度別ページにある資料のうち、使うのは次の2つ（令和8年度のファイル名）。

| 資料 | ファイル | 内容 |
|---|---|---|
| 局別施策の概要 | `r8/documents/04_r8_kyokubetsu.pdf`（150ページ） | 会計ごと・局ごとに、局 → 部 → 事業 → 細事業の予算額（本年度・前年度）と事業内容。一般会計・特別会計・企業会計を含む |
| 別冊 主要事業一覧 | `r8/documents/r8_yosan_gaiyou_bessatsu.pdf`（22ページ） | 各局の政策的な事業の一覧。局 → 部 → 事業名・本年度予算額・事業内容。**「★：新規事業、○：拡充事業」の印**がある |

- どちらも**単位は千円**。局別施策の概要は「（　）内は前年度予算額」
- ほかに「予算の概要」本編（予算の柱・主な事業）、各会計予算説明書、定例会ごとの補正予算の概要もある
- テキスト抽出すると表の行順が崩れる（見出しと数値が離れる）。**金額・事業名は PDF 原本と照合する**。テキスト抽出は `pdftotext -layout`（poppler-utils）を使い、未導入ならユーザーに導入を依頼する

## 登録前に決めること（未決事項）

札幌市の資料は福岡市版のテーブル設計と1対1に対応しない。**以下をユーザーに確認してから作業する**。

1. **金額の単位**: DBの金額列は bigint で単位の決まりが無い。福岡市版は千円で入れていた（財政局だけ円で入っていた）。一方、予算チャットの `web/src/features/chat/server/services/handle-chat-request.ts` は `totalBudget / 10000` で億円に換算しており、**万円単位を前提にしている**。千円のまま入れると、チャットでの金額が10倍になる。単位を決め、必要ならコードを直す（別PR）
2. **対象の会計**: 一般会計の局だけにするか、特別会計・企業会計（交通局・水道局・病院局など）も含めるか
3. **テーマ（budget_themes）の切り方**: 主要事業一覧は「部」ごとに事業が並ぶので、テーマ = 部 が素直。局別施策の概要の「事業」（例: 防災対策推進費）をテーマにする案もある
4. **局の方針（direction）**: 上の2つの資料には、局ごとの編成方針にあたる文章が無い。主要事業から要約して作るか、空にするか
5. **印の無い事業の badge**: `continued`（画面に「継続」と出る）にするか null（何も出ない）にするか
6. **department_slug**: URL（`/budget/[session_slug]/[department_slug]`）に使うローマ字のスラッグ。福岡市はPDFのファイル名から取っていたが、札幌市は局ごとのファイルが無いので、付け方を決める

## DBマッピング

### budget_overviews（局単位）

| フィールド | 内容 |
|---|---|
| `council_session_id` | 当初予算を審議した第1回定例会（令和8年度予算 → `r8-1`）のID |
| `department_name` / `department_slug` | 局名（例: 危機管理局）/ 未決事項 6 |
| `direction` | 未決事項 4 |
| `total_budget` / `prev_budget` | 局別施策の概要にある局の本年度・前年度の予算額（未決事項 1 の単位で） |
| `sort_order` | 局別施策の概要の掲載順 |
| `source_url` | 局別施策の概要PDFのURL（全局で同じ） |
| `publish_status` | 登録時 `draft` → 確認後 `published`。web は `published` だけを表示する |

### budget_themes（テーマ単位）

`overview_id` / `title` / `budget_amount` / `ai_summary`（テーマのねらいを市民向けに要約）/ `sort_order`。切り方は未決事項 3。

### budget_initiatives（個別事業）

主要事業一覧の事業を入れる。

| フィールド | 内容 |
|---|---|
| `theme_id` | 所属するテーマ |
| `title` | 事業名（PDFで折り返されて2行に分かれていることがあるので、つなげる） |
| `budget_amount` | 本年度予算額（未決事項 1 の単位で） |
| `description` | 事業内容 |
| `badge` | ★ → `new`、○ → `expanded`（PDFには「○」と「〇」の両方の字が使われている）、印なし → 未決事項 5 |
| `sort_order` | PDFの掲載順 |

## 手順

1. 年度別ページで、局別施策の概要と主要事業一覧のPDFを取得する
2. テキストを抽出し、局ごとに予算額・部・事業・印を抜き出す
3. テーマの ai_summary と、必要なら局の direction を作る
4. **ユーザーレビュー（必須）**: 生成内容を提示し、承認を得る（CLAUDE.md「AI生成コンテンツのDB更新ルール」）。**金額と事業名はPDF原本と1件ずつ照合する**
5. `draft` で登録する（overviews → themes → initiatives の順）。予算には管理画面が無いので、REST または SQL で書き込む。接続は `db-access` スキルの規約に従うが、北海道版の本番DBは未確定（VPS 移行待ち）で `db-access` の記載は福岡市版のまま。**書き込み先は必ずユーザーに確認する**
6. web の `/budget/[session_slug]` の一覧と局別の詳細ページで表示を確認する（テーマの並び順・バッジ）
7. 確認後に `published` にする

## 議案ページとの関係

予算案そのもの（「令和8年度札幌市一般会計予算」などの議案）は `update-bills` スキルで登録する。このスキルのデータは `/budget` 配下の重点施策ページ用。
