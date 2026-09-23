# 札幌市版 FORK_GUIDELINES 適応手順書

作成日: 2026-05-20

## 1. 背景と方針

本リポジトリ `mirai-gikai-hokkaido` は、`bakumon1107/mirai-gikai-fukuoka-city`
を upstream としてフォークしたもの。ディレクトリ名・origin リポジトリ名は
既に「hokkaido」に改名済みだが、**コード・設定・シードデータの大半は
まだ福岡市仕様のまま** となっている。

本書では、このリポジトリをそのまま「みらい議会＠札幌市」として
公開できるよう、upstream の
[`FORK_GUIDELINES.md`](../mirai-gikai-upstream/FORK_GUIDELINES.md)
の必須要件に沿って差し替える作業を整理する。

- **対象スコープ**: 札幌市議会版（北海道議会・他の道内自治体は別ブランチで
  対応する想定。本書では札幌市分のみ扱う）
- **既存ドキュメント参照**:
  - [上流: FORK_GUIDELINES.md](../mirai-gikai-upstream/FORK_GUIDELINES.md)
  - [福岡市版の FORK 適応設計書](20260422_1000_FORK_GUIDELINES適応設計書.md)
  - [川崎版の Fork 手順書](kawasaki/20260304_1000_別地域向けfork手順.md)
  - [環境構築・北海道版移行ノート](20260517_1857_環境構築_APIキー取得_北海道版移行ノート.md)

---

## 2. FORK_GUIDELINES 必須要件 × 現状サマリ

| # | 要件（FORK_GUIDELINES） | 現状 | 対応要否 |
|---|------------------------|------|---------|
| 1 | 「みらい議会＠地域名」形式 or 独自名 | `みらい議会＠福岡市` のまま | **要変更** |
| 2 | チームみらいロゴを使用しない | 福岡市版で既にテキストロゴに差し替え済み | **再差し替え（札幌市表記）** |
| 3 | ヒーロー画像・OGP画像の差し替え | 福岡市夜景画像のまま | **要差し替え** |
| 4 | primary カラーを変更（teal 禁止） | 福岡版でラベンダー `#a495d6` に変更済み | **任意（札幌色に変えると差別化◎）** |
| 5 | 免責文言の表示 | `FooterDisclaimer` で常時表示済み | **流用可** |
| 6 | AGPL: ソースコード公開リンク | footer に福岡リポジトリ URL のまま | **要変更（札幌版リポURL）** |

---

## 3. 札幌市版で差し替える項目

### 3-1. サービス名・メタデータ

| ファイル | 現在値 | 変更後 |
|---------|--------|--------|
| `web/src/config/site.config.ts` `siteName` | `みらい議会＠福岡市` | `みらい議会＠札幌市` |
| 同 `siteDescription` | `福岡市議会で...` | `札幌市議会で今どんな議案が検討されているか、わかりやすく伝えるプラットフォームです` |
| 同 `cityName` | `福岡市` | `札幌市` |
| 同 `councilName` | `福岡市議会` | `札幌市議会` |
| 同 `keywords` | 福岡市関連 | `みらい議会ー札幌市版`, `札幌市`, `市議会` 等 |
| 同 `councilBaseUrl` | `https://gikai.city.fukuoka.lg.jp/` | `https://www.city.sapporo.jp/gikai/` （要確認） |
| 同 `councilBillsDetailUrl` | `.../result/result/` | 札幌市議会の議案・議決結果一覧 URL（要調査） |
| 同 `twitterHashtag` | `みらい議会福岡市版` | `みらい議会札幌市版` |
| 同 `operator.jurisdiction` | `福岡地方裁判所` | `札幌地方裁判所` |
| `admin/src/config/site.config.ts` `siteName` | `みらい議会ー福岡市版` | `みらい議会ー札幌市版` |
| 同 `cityName` / `councilName` / 各 URL | 福岡市 | 札幌市 |
| 同 `councilFactionExamples` | 福岡市議団例 | 札幌市議会の代表的会派名 |
| `web/public/manifest.json` `name` / `short_name` / `description` | 福岡市表記 | 札幌市表記 |

### 3-2. 免責文言・ソースコードリンク

| ファイル | 変更内容 |
|---------|---------|
| `web/src/components/layouts/footer/footer.tsx` | `FooterDisclaimer` は流用可（文言変更不要） |
| `web/src/components/layouts/footer/footer.config.ts` `policyLinks` | ソースコードリンクを `https://github.com/s-takahashi-hokkaido/mirai-gikai-hokkaido` に変更 |

### 3-3. ロゴ・アイコン・ヒーロー画像

| ファイル | 用途 | 対応 |
|---------|------|------|
| `web/public/img/logo.svg` | サイトロゴ | 「みらい議会／＠札幌市」テキストロゴに差し替え |
| `web/public/img/hero_background.png` | TOPヒーロー背景 | 札幌の街並み or 雪景色 + テーマカラーオーバーレイ |
| `web/public/ogp.png` (1200×630) | OGP/SNSシェア画像 | 札幌市版に差し替え。SNS各社はSVGを受け付けないため必ずPNG/JPGにする（原本は `docs/assets/ogp.svg`、参照先は `siteConfig.ogImage`） |
| `web/public/icons/pwa/icon_fukuoka.svg` | PWAアイコン | **ファイル名ごと `icon_sapporo.svg` 等にリネーム**し、参照側 (`layout.tsx`, `manifest.json`) も書き換え。`admin/public/icons/pwa/` 配下も同じアイコンに差し替えること |
| `web/public/icons/pwa/icon_ios.png` (180×180) | iOS PWA | 札幌アイコンに差し替え |
| `web/public/icons/pwa/icon_android_192.png` / `icon_android_512.png` | Android PWA | 同上 |

> `web/src/app/layout.tsx` の `icons.icon` / `icons.apple` も
> `/icons/pwa/icon_fukuoka.svg` を新ファイル名に書き換えること。

### 3-4. カラーテーマ（任意・推奨）

FORK_GUIDELINES が直接禁じているのは upstream のティール (`#2aa693` 系)。
現在は福岡市版のラベンダー (`#a495d6`) に変更済みで、技術的には
そのまま使えるが、**福岡市版とも区別したい場合は札幌市らしい配色に
再設定することを推奨**。

参考案（雪・北海道のクリーンブルー系）:

| トークン | 福岡市値 | 札幌市案 |
|---------|---------|---------|
| `--primary` | `#a495d6` | `#3b82c4`（札幌の空・雪解け川を意識した深めのブルー） |
| `--primary-accent` | `#7a6cc0` | `#1e5a8c` |
| `--color-mirai-gradient-start` | `#dbd3f9` | `#cfe3f5` |
| `--color-mirai-gradient-end` | `#ede9fd` | `#e8f2fb` |
| `manifest.json` `theme_color` | `#a495d6` | `#3b82c4`（`--primary` と同期） |

変更箇所: `web/src/app/globals.css`, `web/public/manifest.json`。
最終的な色は札幌市公式の意匠・ロゴ案と合わせて決定する。

### 3-5. シードデータ

| ファイル | 内容 | 対応 |
|---------|------|------|
| `packages/seed/main/data.ts` | 定例会・会派・委員会 | 札幌市議会の名称・期日に差し替え |
| `packages/seed/main/bill-contents-data.ts` | 議案サンプル（子ども医療費助成等） | 札幌市の実議案ベースに書き直し（現在は福岡市の議案がそのまま） |
| `packages/seed/fukuoka/` 配下 | 福岡市議会専用スクレイパー・パーサー | 札幌市議会向けに `packages/seed/sapporo/` を新設してリプレース。福岡用ディレクトリは当面残しつつ最終的に削除（2026-09-17: `fukuoka/`・`sapporo/` とも削除済み。議案は人手登録の運用） |

### 3-6. 機能ロジック内に残る「福岡市」表記

以下のファイルに「福岡」文字列が残っており、UI上または AI プロンプトに
出現する可能性があるため、用途を確認のうえ札幌市表記に置換する：

- `web/src/features/budget-overview/server/components/budget-overview-detail.tsx`
- `web/src/features/bills/client/components/bill-detail/faction-stance-card.tsx`
- `web/src/features/bills/server/components/session-bills-page.tsx`
- `web/src/features/chat/server/services/handle-chat-request.ts`
- `admin/src/features/bills/server/services/auto-feature-evaluator.ts`
- `web/src/app/dev/_lib/mock-data.ts`

> 検出コマンド:
> ```bash
> grep -rln "福岡" web/src admin/src packages/seed \
>   --include="*.ts" --include="*.tsx" --include="*.json" \
>   | grep -v node_modules
> ```

### 3-7. データソース（札幌市議会）調査が必要なもの

- 札幌市議会 議案・議決結果 一覧ページの URL（`councilBillsDetailUrl`）
- 札幌市議会 会議録検索システムの URL とパーサー
- 議員・会派マスタの一次ソース
- 委員会マスタ

詳細は別途「札幌市議会データ取込設計書」として
`docs/sapporo/` を新設して整理する想定。

---

## 4. 作業フェーズ

ブランディング系（Phase A）から先行して進め、データ整備（Phase C）は
ソース調査が必要なため並行で進める。

### Phase A: ブランディング差し替え（PR 1〜2本程度）

- [ ] `web/src/config/site.config.ts` を札幌市仕様に書き換え
- [ ] `admin/src/config/site.config.ts` を札幌市仕様に書き換え
- [ ] `web/public/manifest.json` を札幌市仕様に書き換え
- [ ] `web/src/app/layout.tsx` のアイコン参照を `icon_sapporo.svg` に変更
- [ ] `web/src/components/layouts/footer/footer.config.ts` のソースコード
      リンクを `s-takahashi-hokkaido/mirai-gikai-hokkaido` に変更

### Phase B: ビジュアル差し替え（PR 1本）

- [ ] `web/public/icons/pwa/icon_fukuoka.svg` → `icon_sapporo.svg` 新規作成
- [ ] `web/public/icons/pwa/icon_ios.png` / `icon_android_192.png` /
      `icon_android_512.png` を札幌市アイコンに差し替え
- [ ] `web/public/img/logo.svg` を札幌市版テキストロゴに差し替え
- [ ] `web/public/img/hero_background.png` を札幌市らしい画像に差し替え
- [ ] `web/public/ogp.png` を札幌市版 OGP に差し替え（原本 `docs/assets/ogp.svg` を 1200×630 の PNG に書き出す）
- [ ] （任意）`globals.css` のカラートークンを札幌色に更新

### Phase C: コンテンツ・データ差し替え（複数 PR）

- [ ] `packages/seed/main/data.ts` の定例会・会派・委員会を札幌市議会に変更
- [ ] `packages/seed/main/bill-contents-data.ts` を札幌市議案ベースに刷新
- [ ] `packages/seed/fukuoka/` 相当の処理を札幌市向けに新設
- [ ] features 配下の「福岡」残置を全置換（3-6 のリスト）
- [ ] `web/src/app/dev/_lib/mock-data.ts` の福岡サンプルを札幌に書き換え
- [ ] Langfuse のプロンプトを札幌市文脈に更新

### Phase D: リリース前検証

- [ ] `grep -rln "福岡\|fukuoka" web/src admin/src packages/seed --include="*.ts" --include="*.tsx" --include="*.json" | grep -v node_modules` で残置 0 を確認（残す場合は理由を `docs/` にメモ）
- [ ] `pnpm lint && pnpm typecheck && pnpm test` 通過
- [ ] `pnpm dev` でローカル表示確認
  - [ ] TOP（サイト名・説明・ヒーロー・外部リンク）
  - [ ] 議案詳細（SNSシェア時のハッシュタグ・タイトル）
  - [ ] フッター（免責文言・ソースコードリンク先）
  - [ ] PWA インストール時のアイコン
- [ ] OGP プレビュー確認（<https://ogp.biz/> 等）
- [ ] Twitter Card プレビュー確認

---

## 5. AGPL-3.0 義務の対応状況

| 義務 | 対応 |
|------|------|
| ソースコードの公開（第13条） | `origin` リポジトリ（`s-takahashi-hokkaido/mirai-gikai-hokkaido`）が public であり、footer のリンクで導線を提供 |
| ライセンスの継承 | `LICENSE` (AGPL-3.0) はリポジトリルートに保持済み |
| 変更の明示（第5条 (a)） | 本書および `docs/20260517_1857_環境構築_APIキー取得_北海道版移行ノート.md` で「福岡市版からのフォーク・札幌市版への改変」を明示 |

> origin リポジトリは Private 設定になっていないか念のため確認すること。
> AGPL-3.0 の SaaS 提供においては「サービスを使うユーザーが
> 改変後ソースに到達できる」状態が必要。

---

## 6. 上流追従について

- 上流 `bakumon1107/mirai-gikai-fukuoka-city` のアップデートを取り込むかは
  個別判断（共通基盤の改善はメリットあり、福岡固有の機能は無視で良い）
- 取り込む場合は `mirai-gikai-upstream/` ディレクトリ（gitignore 済み）で
  upstream の develop を pull し、差分を確認してから本リポジトリの develop
  へ cherry-pick / merge する運用が安全

---

## 7. 参考リンク

- 上流 FORK_GUIDELINES: <https://github.com/bakumon1107/mirai-gikai-fukuoka-city/blob/main/FORK_GUIDELINES.md>
- AGPL-3.0 全文: <https://www.gnu.org/licenses/agpl-3.0.html>
- 札幌市議会: <https://www.city.sapporo.jp/gikai/>（要再確認）
- 本家みらい議会: <https://gikai.team-mir.ai/>
