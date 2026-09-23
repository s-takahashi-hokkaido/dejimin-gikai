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

```bash
# Supabaseの起動
npx supabase start

# 環境変数の設定（必要に応じて.envの内容を変更してください）
cp .env.example .env

# パッケージインストール
pnpm install

# SupabaseのDB初期化, 開発用シードデータのセットアップ
pnpm db:reset

# サーバー起動
pnpm dev
```

### 旧名称（mirai-gikai-hokkaido）のローカル環境から移行する場合

Supabase の `project_id` を `mirai-gikai-hokkaido` から `dejimin-gikai` に変更したため、ローカルの Docker コンテナとボリュームは別物として作り直されます。旧コンテナが動いているとポートが競合するので、先に止めてから起動し直してください。ローカル DB のデータは引き継がれないため、シードを入れ直します。

```bash
# 旧名称のコンテナを停止（--no-backup を付けると旧ボリュームも削除される）
npx supabase stop --project-id mirai-gikai-hokkaido

# 新しい名称で起動し、DB を初期化
npx supabase start
pnpm db:reset
```

## マイグレーション

```bash
# マイグレーションファイル生成
npx supabase migration new マイグレーション名

# マイグレーション実行 & 型ファイル更新
pnpm db:migrate
```

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

## 本番デプロイ

[公開デプロイ手順書](docs/fukuoka/20260330_1500_公開デプロイ手順書.md) を参照してください。
