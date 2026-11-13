# デジ民議会

公開URL: （デプロイ後に更新）

## 注意事項

- このプロジェクトは「チームみらい」が開発・運営している「みらい議会」をForkして開発したものとなります。
- **非公式**ですので、ここでの不具合や気になる点についての問い合わせは
  党公式ではなく開発担当者にご連絡ください。

## 他地方議会向けForkガイド

- 他の市議会・県議会等のバージョンを作成したい場合は、
  以下のドキュメントを参考にすると早いと思います
  [fork手順](docs/kawasaki/20260304_1000_別地域向けfork手順.md)

---

# 開発者向け情報

## セットアップ

Node.js は **22**（`.node-version` に記載。CI のビルドと VPS の実行環境に合わせています）、
パッケージマネージャは pnpm 10 を使います。

Supabase CLI はルートの `devDependencies`（`supabase`）で版を固定しているので、`pnpm install` で入ります。
`npx supabase` は最新版を取ってくるため版がずれます。必ず `pnpm exec supabase ...` で実行してください
（`pnpm db:reset` などの scripts と CI も同じ版を使います）。

```bash
# パッケージインストール（Supabase CLI もここで入る）
pnpm install

# Supabaseの起動
pnpm exec supabase start

# 環境変数の設定（必要に応じて.envの内容を変更してください）
cp .env.example .env

# SupabaseのDB初期化, 開発用シードデータのセットアップ
pnpm db:reset

# サーバー起動
pnpm dev
```

### 旧名称（mirai-gikai-hokkaido）のローカル環境から移行する場合

Supabase の `project_id` を `mirai-gikai-hokkaido` から `dejimin-gikai` に変更したため、ローカルの Docker コンテナとボリュームは別物として作り直されます。旧コンテナが動いているとポートが競合するので、先に止めてから起動し直してください。ローカル DB のデータは引き継がれないため、シードを入れ直します。

```bash
# 旧名称のコンテナを停止（--no-backup を付けると旧ボリュームも削除される）
pnpm exec supabase stop --project-id mirai-gikai-hokkaido

# 新しい名称で起動し、DB を初期化
pnpm exec supabase start
pnpm db:reset
```

## マイグレーション

```bash
# マイグレーションファイル生成
pnpm exec supabase migration new マイグレーション名

# マイグレーション実行 & 型ファイル更新
pnpm db:migrate
```

型ファイル（`packages/supabase/types/supabase.types.ts`）は `pnpm db:types:gen` で作り直せます。
CLI の出力を Biome で整形しているので、CLI が出す「`npx oxfmt` で整形せよ」という案内は無視して構いません。

### Supabase CLI の版を上げる

版の指定はルートの `package.json` の1か所だけです（CI の `.github/workflows/integration_test.yml` も `pnpm exec supabase` で同じ版を使います）。

```bash
pnpm add -w -D --save-exact supabase@<版>

# 新しい版のイメージで起動し直す（起動中のコンテナは古い版のまま）
pnpm exec supabase stop && pnpm exec supabase start

pnpm db:reset            # マイグレーション・型の作り直し（db:types:gen）・シードまで通るか
pnpm typecheck           # 型ファイルに差分が出た時
pnpm test:integration
pnpm db:docs             # docs/schema に差分が出たら中身を確かめる
pnpm exec supabase services   # ローカル・CI で使うイメージの版
```

- CLI の版を上げると、ローカルと CI で使う Supabase のイメージ（Postgres・GoTrue・PostgREST・Storage）の版も変わります。
  本番（`infra/compose.yml`）のイメージの版は別に指定しているので、`pnpm exec supabase services` と見比べて、
  差が大きくなっていないか確かめてください。
- GoTrue の版が本番と違うと、`pnpm db:docs` で `docs/schema` の `auth` の部分（`auth.factor_type` など）だけが変わることがあります。
  マイグレーションによる変更でなければコミットに含めません。

## Adminユーザーの作成

1. Supabase Studio上で Authentication > Add User からユーザーを作成
2. Supabase Studio上で以下のSQLを実行

```sql
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"roles": ["admin"]}'::jsonb
WHERE email = '<1で作成したユーザーのemail>';
```

> [!NOTE]
> 開発環境では、seedデータによって、`email: admin@example.com, password: admin123456` のAdminユーザーが作成されます。
> AIインタビュー広場の議題の作成者として、議員 `legislator-a@example.com` / `legislator-b@example.com`（password: `legislator123456`）と
> 候補者 `candidate-c@example.com`（password: `candidate123456`）も `pnpm seed` で作成されます（`packages/seed/main/plaza-topics.ts`）。

## 本番デプロイ

- さくらVPS（現行の構成）: [infra/README.md](infra/README.md)（デプロイの仕組み・Secrets / Variables・VPS 側の配置）と
  [さくらVPS構築手順](docs/20260930_2104_さくらVPS構築手順.md)
- Vercel（Fork 元から引き継いだ構成。VPS への移行が終わったら消します）:
  [公開デプロイ手順書](docs/fukuoka/20260330_1500_公開デプロイ手順書.md)
