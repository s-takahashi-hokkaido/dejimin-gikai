# ローカル docker compose 検証手順

作成日: 2026-09-22
検証結果: [ローカル docker compose 検証結果](20260922_2100_ローカルdocker-compose検証結果.md)（2026-09-22 実施。
実際の設定ファイルは `infra/`。本手順書のコマンドのうち誤っていたものは修正済み）

[プロジェクト方針とやりたいこと整理](20260912_1528_プロジェクト方針とやりたいこと整理.md) §10 の4番
「B. ローカルで docker compose 検証」の手順書。VPS を契約する前に、本番と同じ構成を手元で動かして確かめる。

---

## 1. 目的と完了条件

**VPS に持っていく構成を手元で動かし、アプリ側は環境変数の差し替えだけで今と同じように動くことを確かめる。**

いつもの `npx supabase start` も中身は docker だが、ゲートウェイや Studio まで入った全部入りで、
設定も CLI が面倒を見ている。VPS で使う最小構成の検証にはならない。

特に **`supabase/config.toml` は CLI しか読まない**。匿名サインインや `max_rows` などの設定は、
自前の compose では環境変数で書き直す必要がある（§3 手順0）。

### 完了条件

- §4 のチェックリストがすべて通る
- 本番データを流し込んだ状態で web・admin が動く（§3 手順6）
- VPS に持っていくものが「**compose ファイル、nginx の設定、環境変数**」だけになっている

---

## 2. 構成

```
ブラウザ ─→ nginx :8000 ─┬ /rest/v1/    → rest    (PostgREST)
                          ├ /auth/v1/    → auth    (GoTrue)
                          └ /storage/v1/ → storage (storage-api, ファイル保存)
                                               ↓
                                            db (supabase/postgres 17)

next start (standalone): web :3004 / admin :3003 ─→ nginx :8000
```

ポートは `pnpm dev` と同じにしておく（`config.toml` の `site_url` / `additional_redirect_urls` がこの番号前提）。

### 公式 compose からの取捨選択

公式の self-hosting 用 compose（`supabase/supabase` リポジトリの `docker/`）を元にし、以下だけ残す。
2026-09-22 時点の公式 compose で確認した。**ゲートウェイは Kong から Envoy に変わっている**
（方針 §5 の表の「kong」は、今はこの Envoy のこと）。

| サービス | 判断 | 理由 |
|---|---|---|
| db / auth / rest | 残す | 必須 |
| storage | 残す | まずはアプリ無変更で動くかを確かめる。nginx 静的配信への置き換え（方針 §9-1）はその後で判断 |
| api-gw（Envoy / Kong） | 削る | nginx で代替 |
| studio / meta | 削る | 必要なら SSH トンネル越しにローカルから |
| realtime | 削る | アプリで無効（`config.toml` の `[realtime] enabled = false`） |
| imgproxy | 削る | storage 側で `ENABLE_IMAGE_TRANSFORMATION=false` にし、`depends_on` からも外す |
| functions / analytics / vector / supavisor | 削る | 使っていない |

db の初期化 SQL（公式の `volumes/db/*.sql`）は **`roles.sql` と `jwt.sql` だけ**持ってくる。
`realtime.sql` / `webhooks.sql` / `_supabase.sql` / `logs.sql` / `pooler.sql` は削ったサービス用。
本リポジトリのマイグレーションが使う拡張は `uuid-ossp` のみで、`pg_net` なども要らない。

### ファイルの置き場所（案）

```
infra/
├── compose.yml
├── .env.example        # 雛形のみコミット。実値の infra/.env は .gitignore 済み
├── nginx/supabase.conf
└── db/
    ├── roles.sql       # 公式からコピー
    └── jwt.sql         # 公式からコピー
```

まずは本リポジトリの `infra/` に置き、2個目のプロジェクトが出てきた時点で共通基盤として
別リポジトリに切り出す（方針 §1-4「完成度より公開の早さ」）。

---

## 3. 手順

### 手順0: 準備

#### 秘密情報を作る

```bash
openssl rand -hex 32   # JWT_SECRET
openssl rand -hex 24   # POSTGRES_PASSWORD
```

`ANON_KEY` / `SERVICE_ROLE_KEY` は `JWT_SECRET` で署名した HS256 の JWT。
アプリは今も従来形式の anon key（`NEXT_PUBLIC_SUPABASE_ANON_KEY`）を使っているので、この方式で合う。

```bash
JWT_SECRET=<上で作った値> node -e '
const c = require("node:crypto");
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const now = Math.floor(Date.now() / 1000);
for (const role of ["anon", "service_role"]) {
  const h = b64({ alg: "HS256", typ: "JWT" });
  const p = b64({ role, iss: "supabase", iat: now, exp: now + 5 * 365 * 86400 });
  const s = c.createHmac("sha256", process.env.JWT_SECRET).update(`${h}.${p}`).digest("base64url");
  console.log(`${role}: ${h}.${p}.${s}`);
}'
```

#### `config.toml` の設定を環境変数に移す

| `config.toml` | compose の環境変数 | 値 |
|---|---|---|
| `[api] max_rows = 1000` | `PGRST_DB_MAX_ROWS`（rest） | `1000` |
| `[auth] enable_anonymous_sign_ins = true` | `GOTRUE_EXTERNAL_ANONYMOUS_USERS_ENABLED` | `true` |
| `[auth] enable_signup = true` | `GOTRUE_DISABLE_SIGNUP` | `false` |
| `[auth] site_url` | `GOTRUE_SITE_URL` | `http://127.0.0.1:3004` |
| `[auth] additional_redirect_urls` | `GOTRUE_URI_ALLOW_LIST` | カンマ区切りで同じ値 |
| `[auth] jwt_expiry = 3600` | `GOTRUE_JWT_EXP` | `3600` |
| `[auth.email] enable_confirmations = false` | `GOTRUE_MAILER_AUTOCONFIRM` | `true` |
| `[auth.rate_limit] anonymous_users = 30` | `GOTRUE_RATE_LIMIT_ANONYMOUS_USERS` | `30` |

`config.toml` はローカル開発用の値。**本番（Supabase Cloud）の実際の設定はダッシュボードの
Authentication 設定で確認し、違っていれば本番に揃える**。

#### ポート

`supabase start` が 541xx / 544xx を使うので避ける。

- nginx: `127.0.0.1:8000`
- db: `127.0.0.1:5433`（マイグレーションと dump 用）

どちらも `127.0.0.1` にだけ公開する。メモリを正しく測るため、検証中は `npx supabase stop` しておく。

#### Postgres のメモリ

方針 §5 の見積り（Postgres ~300MB）に合わせ、db の `command` に `-c shared_buffers=128MB` を足しておく。
実測は手順7で行う。

#### nginx

ゲートウェイの代わりに、パスを振り分けるだけ。

```nginx
server {
  listen 8000;
  client_max_body_size 50m;

  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $remote_addr;
  proxy_set_header X-Forwarded-Proto $scheme;

  location /rest/v1/    { proxy_pass http://rest:3000/; }
  location /auth/v1/    { proxy_pass http://auth:9999/; }
  location /storage/v1/ { proxy_pass http://storage:5000/; }
}
```

`X-Forwarded-For` は利用者が送ってきた値に追記せず、`$remote_addr` で上書きする。
利用者が偽の IP を名乗ってレート制限を逃れるのを防ぐため。

> **検証結果**: CORS は素通しでは通らなかった。auth は `GOTRUE_CORS_ALLOWED_HEADERS`、storage は nginx で対応した
> （[検証結果](20260922_2100_ローカルdocker-compose検証結果.md) §4-1）。実際の設定は `infra/nginx/supabase.conf`。

ゲートウェイがやっていて nginx ではやらないことが2つある。どちらも §4 で確認する。

- **apikey の検査**: nginx は素通しにする。apikey も JWT も無いリクエストは PostgREST で `anon` ロール扱いになり、
  RLS（ポリシー無し＝全拒否）で何も返らない想定（§4 #8）
- **CORS**: ゲートウェイは CORS プラグインで応答していた。ブラウザが直接叩くのは匿名ログイン（auth）と
  サムネイルのアップロード（storage）。各サービスが自前で CORS を返すかを確かめ、足りなければ nginx で付ける（§4 #2・#6）

ローカルでは nginx もコンテナで立てる。VPS ではホストの nginx（TLS と複数 vhost を持つ）に同じ `location` を書く。

### 手順1: 起動

```bash
cd infra
docker compose up -d
docker compose ps                          # すべて healthy になる
curl -s localhost:8000/auth/v1/health      # GoTrue
curl -s localhost:8000/storage/v1/status   # storage-api
```

rest はテーブルがまだ無いので、手順3のテストで確認する。

### 手順2: マイグレーション

**auth と storage が healthy になってから流す。** 初期スキーマは `auth.users` を参照し、
`storage.buckets` に `bill-thumbnails` を作る。auth と storage はそれぞれ起動時に自分のスキーマを作るので、
その前に流すと失敗する。

```bash
# ローカルの compose は SSL 無しなので sslmode=disable が要る（CLI は既定で SSL を要求する）
npx supabase migration up --include-all \
  --db-url "postgresql://postgres:$POSTGRES_PASSWORD@127.0.0.1:5433/postgres?sslmode=disable"

docker compose exec db psql -U postgres \
  -c "select id, public from storage.buckets"     # bill-thumbnails | t
```

### 手順3: 既存の自動テストを compose に向ける

アプリ用の接続先をまとめた `.env.compose` をリポジトリ直下に作る（`.env.*` は .gitignore 済み）。
`.env` をコピーし、以下を差し替える。

```bash
SUPABASE_URL=http://127.0.0.1:8000
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:8000
SUPABASE_SERVICE_ROLE_KEY=<手順0の SERVICE_ROLE_KEY>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<手順0の ANON_KEY>
NEXT_PUBLIC_WEB_URL=http://127.0.0.1:3004
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3003
```

Langfuse を外す作業（方針 §5 ④）が済むまでは、`.env` と同じ Langfuse のキーを残しておく。
`createPromptProvider()` は Langfuse の初期化に失敗すると throw するため。

```bash
# DB 関数・RLS のテスト
pnpm exec dotenv -e .env.compose -- vitest run --config tests/supabase/vitest.config.mts
# web の結合テスト
pnpm exec dotenv -e .env.compose -- pnpm --filter web exec vitest run --config vitest.integration.config.mts
# シードデータ投入
pnpm exec dotenv -e .env.compose -- pnpm --filter @mirai-gikai/seed seed
# 管理者アカウント（admin@example.com）。seed.sql は supabase db reset でしか流れないので psql で流す
docker compose -f infra/compose.yml exec -T db psql -U postgres -f - < supabase/seed.sql
```

`tests/supabase/` には RLS の全拒否（`rls/default-deny.test.ts`）や、auth スキーマを読む
`get_admin_users` などのテストがある。**これが通れば DB まわりは本番と同じと言える。**

### 手順4: 本番と同じ形でビルドして起動

`web/next.config.ts` と `admin/next.config.ts` に次を足す（方針 §5 の作業項目にある変更そのもの）。

```ts
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../"),
  // 既存の turbopack / images はそのまま
};
```

ビルドと起動（web の例。admin はポート 3003 で同じ手順）:

```bash
pnpm exec dotenv -e .env.compose -- pnpm --filter web build
cp -r web/.next/static web/.next/standalone/web/.next/static
cp -r web/public web/.next/standalone/web/public
PORT=3004 pnpm exec dotenv -e .env.compose -- node web/.next/standalone/web/server.js
```

注意点:

- **`NEXT_PUBLIC_*` はビルド時に JS に埋め込まれる。** compose 向けの値でビルドすること。
  本番ビルド（GitHub Actions）でも本番の値を渡してビルドする必要がある
- モノレポなので、`server.js` は `.next/standalone/web/server.js` のように一段深い場所に出る
- `.next/static` と `public` は standalone に含まれないので手でコピーする。VPS へのデプロイでも同じ処理が要る
- `build` スクリプトは `next build --turbopack`（Next 15.5 ではベータ）。standalone が正しく出るかもここで確かめ、
  問題があれば `--turbopack` を外してビルドする
- `images.remotePatterns` は `127.0.0.1`（ポート指定なし）を許可済みなので、ローカルでは設定変更なしで画像が出るはず。
  本番ドメインは VPS 移行時に足す

### 手順5: ブラウザで機能を確認

§4 のチェックリストを上から順に行う。

### 手順6: 本番データで移行の予行演習

§5 の本番移行の予行演習。ここで手順を固めておけば、本番移行は同じことをもう一度やるだけになる。

> **取り扱い注意**: dump には市民のインタビュー回答が含まれる。作業ディレクトリはリポジトリの外にし、
> コミットせず、検証が終わったら dump ファイルを削除して compose の DB も作り直す。

**1. DB を空に作り直す**

`docker compose down` → `infra/volumes/db/data` と `infra/volumes/storage` を削除 → `docker compose up -d` → 手順2のマイグレーション。

中身はコンテナのユーザー所有なので、削除はコンテナ経由で行う:
`docker run --rm -v "$PWD/volumes:/v" alpine:3 rm -rf /v/db/data /v/storage`

**2. 本番（Supabase Cloud）からデータだけを dump する**

スキーマは手順2のマイグレーションで作ってあるので要らない。

```bash
docker run --rm -v "$PWD":/work postgres:17 pg_dump "$PROD_DB_URL" \
  --data-only --no-owner \
  -t 'public.*' -t auth.users -t auth.identities \
  -f /work/prod-data.sql
```

- 接続文字列はダッシュボードの「Connect」から取る。WSL から IPv6 で繋がらない場合は Session pooler の URL を使う
- `pg_dump` はサーバーと同じ 17 系を使う（docker の `postgres:17` で実行すれば手元に入れなくて済む）
- テーブルを絞るのは、各サービスのマイグレーション管理テーブルや、マイグレーションで作成済みの
  `storage.buckets` まで入れると重複で失敗するため
- `-t` を指定すると `-n` は無視されるので、`public` も `-t 'public.*'` で指定する
- `storage.objects` は入れない。画像ファイルを API でアップロードし直すと行も作られる（4. で行う）

**3. 流し込む**

```bash
docker compose exec -T db psql -U postgres -v ON_ERROR_STOP=1 \
  -c "set session_replication_role = replica" -f - < prod-data.sql
```

- `session_replication_role = replica` で外部キーやトリガーを止め、テーブルの順番を気にせず入れる。
  権限エラーになる場合は `-U supabase_admin` で実行する
- 本番と compose で GoTrue のバージョンが違うと、`auth.users` / `auth.identities` の列が合わずに失敗することがある。
  その場合はエラーの列を確かめ、compose 側の GoTrue のバージョンを本番に寄せる

**4. 画像ファイルを移す**

本番の `bill-thumbnails` バケットのファイル一覧を取り、ダウンロードして compose の storage にアップロードし直す
小さなスクリプトを書く（service role キーで Storage API を使う）。

**5. 画像 URL を書き換える**

`bills.thumbnail_url` には `getPublicUrl` の完全な URL が保存されている
（`admin/src/features/bills-edit/client/lib/thumbnail-storage.ts:55`）。ホスト部分を置き換える。

```sql
update bills
set thumbnail_url = replace(thumbnail_url,
  'https://lxphthejcjrmxhigxvzy.supabase.co', 'http://127.0.0.1:8000')
where thumbnail_url like 'https://lxphthejcjrmxhigxvzy.supabase.co/%';
```

`share_thumbnail_url` など、他にも Storage の URL が入った列がないか確認する。

**6. 確認**

- admin に**本番の今のパスワードで**ログインできる（`auth.users` のパスワードハッシュが移っている）。
  JWT の秘密鍵が変わるので、ログイン中のセッションは切れる＝本番移行後は全員の再ログインが要る
- web で本番と同じ議案・画像が表示される
- 主要テーブル（`bills` / `interview_sessions` / `interview_messages` / `chat_usage_events` / `auth.users`）の件数が本番と一致する

### 手順7: 運用面の確認

**メモリ**

```bash
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}"
ps -o rss=,args= -C node      # web / admin の常駐メモリ（KB）
```

方針 §5 の見積り（合計 ~1.2GB）と比べる。§4 の操作をひと通りやった後にも測る。

**再起動**

`docker compose restart`、`docker compose down && docker compose up -d` のあともデータが残っている。

**バックアップからの復元**

バックアップを空の DB に戻して、アプリが動くことを確かめる。

Supabase の初期化済み DB に全体を `pg_restore` すると、auth・storage の既存オブジェクトと衝突しやすい。
**手順6と同じ「スキーマはマイグレーション、データだけ戻す」方式に揃えるのが有力**。
画像ファイル（`infra/volumes/storage`）もバックアップ対象に含める。
ここでバックアップの取り方（対象テーブル・形式）を決め、cron 設定（方針 §5 の作業項目）に持ち込む。

> **検証結果**: この方式で戻ることを確かめた。画像ファイルは xattr ごと取る必要がある。
> コマンドは [検証結果](20260922_2100_ローカルdocker-compose検証結果.md) §4-4。

---

## 4. 機能確認チェックリスト

| # | 操作 | 確かめること | 関わる部分 |
|---|---|---|---|
| 1 | web で議案一覧・詳細を開く | データが表示される | PostgREST |
| 2 | web でチャットを始める | 匿名ログインが通り、`auth.users` に `is_anonymous = true` の行ができる | GoTrue、CORS |
| 3 | チャットとインタビューを1往復ずつ | 応答が返り、`chat_usage_events` に記録される | コスト上限の DB 関数、AI Gateway |
| 4 | admin でログイン → しばらく操作 → ログアウト | セッションが維持され、トークンが更新される | GoTrue、`admin/src/middleware.ts` |
| 5 | admin で管理者を追加し、そのアカウントでログイン | ログインできる | GoTrue の admin API（service role） |
| 6 | admin でサムネイル画像をアップロード | web に表示される | storage（ブラウザから直接アップロード）、CORS、`images.remotePatterns` |
| 7 | admin で議案を編集・公開切替 | web に反映される | web の `/api/revalidate`（`REVALIDATE_SECRET` を両方に設定） |
| 8 | apikey も Authorization も付けずに `/rest/v1/bills` を叩く | データが返らない（空配列かエラー） | nginx で apikey を検査しないことの確認 |
| 9 | 匿名サインインを上限回数を超えて繰り返す | 上限が IP ごとに数えられる | GoTrue のレート制限 |

#4 は `GOTRUE_JWT_EXP` を一時的に短く（例: `120`）して試すと早い。

#9 は**必ず確かめる**。全員が nginx の IP に見えていると、**サイト全体で1時間30件の匿名ログインで止まる**。
本番で初めて気づくと公開直後に全員がチャットを使えなくなる。

- GoTrue にはレート制限に使う IP のヘッダー名を指定する `GOTRUE_RATE_LIMIT_HEADER` という設定がある。
  nginx が付ける `X-Real-IP` を指定する
  - **検証結果**: 未設定だと IP ごとの上限が**一切掛からない**（全体で止まるのではなく無制限）。
    設定すれば IP ごとに数えられる（[検証結果](20260922_2100_ローカルdocker-compose検証結果.md) §4-2）
- 上限を一時的に下げて（`GOTRUE_RATE_LIMIT_ANONYMOUS_USERS=3`）、ホストからの curl と別コンテナからの curl
  （`docker run --rm --network <compose のネットワーク> curlimages/curl ...`）で試す。
  片方が 429 になっても、もう片方が通れば IP ごとに数えられている

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:8000/auth/v1/signup \
  -H "apikey: $ANON_KEY" -H "Content-Type: application/json" -d '{}'
```

---

## 5. 手元では確かめられないこと（VPS で確認）

- TLS 証明書（Let's Encrypt）と実際の DNS
- 本番ドメイン間（`gikai.` / `gikai-admin.` / `db.`）での CORS とクッキー
- 2GB 実機でのメモリの余裕（スワップ込み）
- メールの到達（SPF / DKIM）

---

## 6. この検証に含めないこと

- **SMTP / メール** — 現状の「管理者追加」は `auth.admin.createUser` にパスワードを直接渡して作る方式で
  （`admin/src/features/admins/server/repositories/admin-repository.ts`）、メールは送っていない。
  SMTP が要るのは C のパスワードリセット（方針 §6 ④）を作る時。その時に compose へ mailpit
  （メールを受け止めるだけのサーバー）を足して確認する
- **Langfuse・GA の撤去、AI Gateway の扱い** — 別タスク（方針 §5）
- **Postgres を複数プロジェクトで共有する構成** — 方針 §5「共通基盤としての組み方」では
  「Postgres は共有インスタンス、プロジェクトごとに database を分ける」としているが、
  Supabase では auth・storage のスキーマを database ごとに初期化する必要があり、ロールはサーバー全体で共有される。
  「database を足すだけ」で済むかは、2個目のプロジェクトを載せる前に別途確かめる

---

## 7. 未決事項

1. Storage を storage-api のままにするか、nginx 静的配信に置き換えるか（方針 §9-1。まず storage-api で動かしてから判断）
2. ~~バックアップの取り方（対象テーブル・形式・画像ファイル）。手順7で決める~~ — 決定（検証結果 §4-4）
3. ~~nginx で CORS を付ける必要があるか（§4 #2・#6 の結果次第）~~ — storage だけ nginx で付ける（検証結果 §4-1）
4. `infra/` をいつ別リポジトリに切り出すか

---

## 関連ドキュメント

- `docs/20260912_1528_プロジェクト方針とやりたいこと整理.md` — 方針。本手順は §5（B）と §10 の4番
- [Supabase 公式: Self-Hosting with Docker](https://supabase.com/docs/guides/self-hosting/docker)
