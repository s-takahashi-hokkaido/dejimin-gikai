# ローカル docker compose 検証結果

作成日: 2026-09-22

[ローカル docker compose 検証手順](20260922_1716_ローカルdocker-compose検証手順.md) を実際に行った結果の記録。
手順書の想定と違った点・新しく分かった点は §4 にまとめた。

---

## 1. 結論

**VPS に持っていく構成（Supabase 最小構成＋nginx、standalone ビルドの web / admin）で、アプリは今と同じように動く。**
ローカルではアプリ側の変更は `next.config.ts` の `output: "standalone"` だけで、あとは環境変数の差し替えで済んだ。
VPS では加えて `images.remotePatterns` に本番のドメインを足す必要がある（方針 §5 の作業項目のとおり）。

ただし、手順書の想定どおりには行かなかった点が3つあり、どれも本番でそのまま踏むと事故になる。

- **CORS**: nginx の素通しでは、ブラウザからの匿名ログインとサムネイルアップロードが通らない（§4-1）
- **匿名ログインのレート制限**: 設定を1つ足さないと**上限が一切掛からない**（§4-2）
- **メールアドレスでのサインアップ**: `config.toml` の値のままだと、誰でも API から確認済みのアカウントを作ってログインできる（§4-3）

完了条件（手順書 §1）のうち、手順6の本番データでの予行演習は未実施（本番の接続情報が必要なため）。

---

## 2. 作ったもの

| ファイル | 内容 |
|---|---|
| `infra/compose.yml` | db / auth / rest / storage / nginx。イメージの版は Supabase CLI（`npx supabase start`）と同じ |
| `infra/nginx/supabase.conf` | パスの振り分け、storage の CORS、上流の IP の引き直し（`resolve`）と接続の使い回し（`keepalive`） |
| `infra/db/roles.sql` / `jwt.sql` | 公式の初期化 SQL。`roles.sql` は削ったサービス用のロールの行を外した |
| `infra/.env.example` | 秘密情報と URL の雛形。実値の `infra/.env` はコミットしない |
| `web/next.config.ts` / `admin/next.config.ts` | `output: "standalone"` と `outputFileTracingRoot` を追加。`turbopack.root` も同じ絶対パスにした（相対パスで警告が出ていた） |
| `.gitignore` | `infra/volumes/`（DB・画像ファイルの置き場）と、`infra/` 直下の dump・tar を追加 |

---

## 3. 機能確認チェックリストの結果

手順書 §4 の結果。ブラウザ操作は Playwright（ヘッドレス Chromium）で行った。

| # | 確かめたこと | 結果 |
|---|---|---|
| 1 | web で議案一覧・詳細が表示される | OK |
| 2 | 匿名ログインが通る | OK（CORS 対応後。§4-1） |
| 3 | チャット・インタビューの往復 | **未確認**。ローカルの `.env` に AI Gateway と Langfuse のキーが無い。DB 側（`chat_usage_events` への記録、コスト上限の DB 関数）は web の結合テストで確認済み |
| 4 | admin ログイン、セッション維持とトークン更新 | OK。`GOTRUE_JWT_EXP=60` にして75秒後も操作でき、`refresh_token` で更新されていた |
| 5 | admin で管理者を追加し、そのアカウントでログイン | NG。**既存の不具合で compose とは無関係**（§5-2） |
| 6 | サムネイルの削除・アップロードをし、web に表示される | OK（CORS 対応後）。`/_next/image` 経由で `127.0.0.1:8000` から取得できた |
| 7 | 公開切替が web に反映される | OK（admin → web の `/api/revalidate`）。ただしトップの「注目の議案」に下書きが残る**既存の不具合**あり（§5-1）。長く動かした web で反映されない場面もあった（§4-8） |
| 8 | apikey も JWT も無いリクエスト | OK。`/rest/v1/bills` は空配列、`get_admin_users` は permission denied、偽の JWT は 401 |
| 9 | 匿名ログインのレート制限が IP ごとに効く | OK（`GOTRUE_RATE_LIMIT_HEADER` 設定後。§4-2） |

自動テストも compose に向けて実行し、すべて通った。

- DB 関数・RLS のテスト（`tests/supabase/`）: 46件
- web の結合テスト: 100件

---

## 4. 分かったこと

### 4-1. CORS はゲートウェイがやっていた

公式構成では Kong / Envoy が CORS を一括で返していた。nginx で素通しにすると次のようになる。

| サービス | 挙動 | 対応 |
|---|---|---|
| auth（GoTrue） | 自前で CORS を返すが、許可ヘッダーに `apikey` が無い。supabase-js は必ず `apikey` を付けるのでプリフライトで弾かれる | `GOTRUE_CORS_ALLOWED_HEADERS: apikey` |
| storage（storage-api） | CORS に一切応答しない（OPTIONS は 404） | nginx の `/storage/v1/` で返す |
| rest（PostgREST） | 自前で正しく返す | 不要 |

nginx で全部に CORS を付けると、自前で返す rest / auth とヘッダーが重複してブラウザに弾かれる。そのため storage だけにした。

### 4-2. `GOTRUE_RATE_LIMIT_HEADER` が無いと、匿名ログインは無制限

手順書では「全員が nginx の IP に見えて、サイト全体で1時間30件で止まる」ことを心配していたが、実際は逆だった。
上限を3件に下げて試した結果:

| 設定 | ホストから5回 | ホストから IP を偽装 | 別コンテナ（別 IP）から2回 |
|---|---|---|---|
| `GOTRUE_RATE_LIMIT_HEADER: X-Real-IP` | 200 200 200 **429 429** | **429**（nginx が上書きするので無効） | 200 200 |
| 未設定 | 200 200 200 200 200 | 200 | 200 200 |

**GoTrue は、このヘッダーが設定されていないと IP ごとのレート制限を掛けない。**
匿名ユーザーは AI コストの上限（ユーザー単位）の単位でもあるため、無制限に作れると上限をすり抜けられる
（全体上限 `AI_GLOBAL_DAILY_COST_LIMIT_USD` は効く）。

**VPS での注意**

- **nginx を2段にする場合**（ホストの nginx が TLS を受け、compose の nginx :8000 に渡す）: compose 側の `$remote_addr` は
  ホスト（docker のゲートウェイ）になり、全員が同じ IP として数えられる＝サイト全体で1時間30件で止まる。
  compose 側の nginx で `set_real_ip_from`（docker のゲートウェイ）と `real_ip_header X-Real-IP` を設定し、ホストが付けた値を使う。
  `X-Forwarded-Proto` も同様にホストの値を引き継ぐ
- **ホストの nginx から各サービスへ直接振り分ける場合**: 今の compose は rest / auth / storage のポートを公開していないので、
  `127.0.0.1` に公開する設定を足す
- web / admin のサーバー側からの GoTrue 呼び出し（admin の middleware でのトークン更新など）は、Next.js のサーバーの IP として数えられ、
  全利用者で1つの枠（トークン更新は既定で5分150回）を共有する。web の匿名ユーザーのトークン更新は主にブラウザから行われるので当面は問題にならない見込みだが、
  429 が出たら `GOTRUE_RATE_LIMIT_TOKEN_REFRESH` を上げる
- どちらの構成でも、VPS で同じ試験（上限を下げて2つの IP から叩く）を必ずやり直す

### 4-3. メールアドレスでのサインアップが開いている

`config.toml`（ローカル開発用）は `enable_signup = true` かつ `enable_confirmations = false`。これをそのまま移すと、
**誰でも API から任意のメールアドレスで確認済みのアカウントを作り、その場でセッションを得られる**。
匿名ログインの上限（§4-2）とは別枠なので、ユーザー単位の AI コスト上限を何度でも取り直せる。

アプリのユーザーは管理画面から `auth.admin.createUser`（`email_confirm: true`）で作っているだけで、一般のメールサインアップは使っていない。
設定を変えて試した結果:

| 設定 | 匿名ログイン | メールでサインアップ | 管理者の作成 |
|---|---|---|---|
| `config.toml` のまま | 200 | 200・**即セッション発行** | 200 |
| `GOTRUE_DISABLE_SIGNUP=true` | **422（止まる）** | 422 | 200 |
| `GOTRUE_MAILER_AUTOCONFIRM=false`（採用） | 200 | 200・セッション無し（ログインしても `email_not_confirmed`） | 200 |

`DISABLE_SIGNUP` は匿名ログインまで止めるので使えない。`MAILER_AUTOCONFIRM=false` にした。

残る問題:

- 未確認のユーザー行は作られる。将来の管理者のメールアドレスを先に登録されると、管理画面からの作成が「登録済み」で失敗する（行を消せば作れる）
- **SMTP を設定すると（C のパスワードリセット）、確認メールが実際に届くようになり、メールを受け取れる人なら確認済みアカウントを作れる。**
  その時点で、メールでのサインアップ自体を塞ぐ手段（GoTrue の Auth Hook、nginx での遮断など）を決める
- **本番（Supabase Cloud）の設定も確認すること。** ダッシュボードの Authentication で「Confirm email」が無効なら、今の本番でも同じことができる

`GOTRUE_PASSWORD_MIN_LENGTH` も `config.toml` の 6 のまま。管理者のパスワードの最低文字数なので、議員に開放する前に見直す（管理画面の表示「6文字以上」と合わせて変える）。

### 4-4. 手順書のコマンドや構成の修正

| 箇所 | 問題 | 修正 |
|---|---|---|
| 手順2 `supabase migration up --db-url` | CLI が SSL 接続を要求して失敗する | ローカルでは URL に `?sslmode=disable` を付ける |
| 手順3 シード | `pnpm seed` は管理者アカウントを作らない（`supabase/seed.sql` は `supabase db reset` でしか流れない） | `docker compose exec -T db psql -U postgres -f - < supabase/seed.sql` |
| storage の healthcheck | `localhost` が `::1` に解決され、IPv4 でしか待ち受けない storage-api に届かず unhealthy になる | `127.0.0.1` を使う |
| db の healthcheck | 初回の初期化が長引くと unhealthy になり、auth などが起動しない | `start_period: 60s` |
| nginx の上流 | 起動時に1度だけ名前を引くので、サービスのコンテナを作り直して IP が変わると届かなくなる | `upstream` に `resolve` を付け、docker の DNS で引き直す。IP が変わっても追従することを確認した |
| nginx → storage | ポート付きの Host と `X-Forwarded-Prefix` を渡していないため、storage-api が自分の URL（TUS の Location など）を正しく組み立てられない | `Host $http_host` と `X-Forwarded-Prefix: /storage/v1` |
| volumes の削除 | 中身がコンテナのユーザー所有で、ホストから `rm` できない | `docker run --rm -v "$INFRA/volumes:/v" alpine:3 rm -rf /v/db/data /v/storage` |

### 4-5. バックアップと復元の方式（手順書 §7 未決事項 2）

「スキーマはマイグレーション、データだけ戻す」方式で、件数・パスワードログイン・画像表示まで戻ることを確かめた。

以下のコマンドは `INFRA`（リポジトリの `infra/` の絶対パス）と `BACKUP_DIR`（**リポジトリの外**）を決めてから実行する。
dump には市民のインタビュー回答と、利用者のメールアドレス・パスワードハッシュが含まれる。

```bash
INFRA=/path/to/mirai-gikai-hokkaido/infra
BACKUP_DIR=/path/outside/repo/backup-$(date +%Y%m%d)
mkdir -p "$BACKUP_DIR"
cd "$INFRA"
set -a; . ./.env; set +a   # POSTGRES_PASSWORD など
```

**バックアップ**

```bash
# どのマイグレーションまで当たった DB のデータかを記録する（復元時に同じ版のスキーマを作るため）
docker compose exec -T db psql -U postgres -tAc \
  "select version from supabase_migrations.schema_migrations order by version" > "$BACKUP_DIR/migrations.txt"

# データのみ。マイグレーション管理表と、マイグレーションが作る storage.buckets は除く
docker compose exec -T db pg_dump -U supabase_admin --data-only --no-owner \
  -n public -n auth -n storage \
  -T auth.schema_migrations -T storage.migrations -T storage.buckets > "$BACKUP_DIR/data.sql"

# 画像ファイル。storage-api は Content-Type と Cache-Control をファイルの拡張属性（xattr、user.supabase.*）に持っているので、
# xattr ごと取る。落とすと復元した画像が application/octet-stream で返る
docker run --rm -v "$INFRA/volumes:/v" -v "$BACKUP_DIR:/b" ubuntu:24.04 \
  tar --xattrs --xattrs-include='user.*' -C /v -cf /b/storage.tar storage
```

**復元**

```bash
# 1. 止めてから中身を消す。起動中にディレクトリを作り直すと、コンテナは消えた古いディレクトリを見続ける
#    （Docker Desktop（WSL）ではマウント自体が壊れ、--force-recreate するまで起動できなくなった）
docker compose down
docker run --rm -v "$INFRA/volumes:/v" alpine:3 rm -rf /v/db/data /v/storage

# 2. 画像ファイルを xattr ごと戻す
docker run --rm -v "$INFRA/volumes:/v" -v "$BACKUP_DIR:/b" ubuntu:24.04 \
  tar --xattrs --xattrs-include='user.*' -C /v -xf /b/storage.tar

# 3. 起動して、migrations.txt の最後の版までマイグレーションを流す
#    （リポジトリの最新がそれより新しい場合は、その版のコミットを checkout してから流す）
#    supabase CLI は実行したディレクトリの supabase/migrations を読むので、リポジトリ直下で実行する
docker compose up -d
( cd "$INFRA/.." && npx supabase migration up --include-all \
  --db-url "postgresql://postgres:$POSTGRES_PASSWORD@127.0.0.1:5433/postgres?sslmode=disable" )

# 4. データを流し込む。session_replication_role の変更には superuser が要るので supabase_admin で実行する
( echo "set session_replication_role = replica;"; cat "$BACKUP_DIR/data.sql" ) \
  | docker compose exec -T db psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -q

# 5. リポジトリを最新に戻していれば、残りのマイグレーションを流す
```

古い版のデータを新しいスキーマに直接流し込むと、列の変更で失敗したり、`session_replication_role = replica` のせいで
新しく足した外部キーを満たさない行が黙って入ったりする。必ず手順3で版を揃える。

cron 化（方針 §5 の作業項目）は、この3つ（`migrations.txt` / `data.sql` / `storage.tar`）を日次で取る形にする。

### 4-6. standalone ビルド

- 出力サイズは web 118MB / admin 74MB（元の `node_modules` は約1GB）
- `next build --turbopack` のままで standalone が正しく出た
- ビルド時の警告は2種類で、どちらも standalone とは無関係で、起動・動作にも影響しなかった
  - `require-in-the-middle` を external にできない: Langfuse のテレメトリ（OpenTelemetry）由来。方針 §5 ④ で外す
  - `streamdown` / `shiki` の動的 import
- `.next/static` と `public` のコピーが要るのは手順書のとおり
- `web` / `admin` の `start` スクリプトは `next start` のまま。standalone では `node .next/standalone/<app>/server.js` で起動するので、
  VPS のデプロイ（GitHub Actions → rsync → systemd）を作る時に、コピーと起動をまとめたスクリプトにする

### 4-7. メモリ実測

§3 の操作をひと通り行った後に測った値（シードデータ程度の量）。

| プロセス | 実測 | 方針 §5 の見積り |
|---|---|---|
| db（`shared_buffers=128MB`） | 61 MiB | ~300MB |
| rest（PostgREST） | 48 MiB | ~80MB（auth と合わせて） |
| auth（GoTrue） | 10 MiB | |
| storage（storage-api） | 116 MiB | ~100MB |
| nginx | 8 MiB | ~20MB |
| web（`node server.js`） | 230 MiB | ~250MB |
| admin（`node server.js`） | 190 MiB | ~250MB |
| **合計** | **約 660 MiB** | ~1.0GB（OS を除く） |

2GB の VPS に収まる。Postgres はデータが増えると `shared_buffers` の上限まで伸びる。
storage-api を nginx 静的配信に置き換えると（方針 §9-1）、約 116 MiB 減る。

### 4-8. 長く動かした web で、キャッシュの無効化が効かない場面があった（原因は推定）

admin の公開切替は web の `/api/revalidate`（`revalidateTag("bills")`）でキャッシュを消す。
起動して約45分動かした web で、無効化の API は成功を返すのに議案詳細が古いまま（10分の期限切れまで）になった。
**web を再起動した後は、同じ操作を3回続けてすべて即座に反映された。**

Next.js 15.5.9 のセルフホスト用のキャッシュは、タグを無効化した時刻を単調時計（`performance.timeOrigin + performance.now()`）で、
キャッシュを書いた時刻を壁時計（`Date.now()`）で記録し、両者を比べて古いかを判定している。
WSL2 はスリープ復帰などで壁時計が補正され、長く動いたプロセスでは両者がずれるため、それが原因と推定している（未確定）。

VPS（時刻は NTP で緩やかに補正される）では起きにくいと思われるが、**VPS で web を数日動かした後に公開切替が即座に反映されるかを確かめる**。
反映されない場合でも、キャッシュの期限（`revalidate: 600`）で最大10分後には反映される。

---

## 5. 見つかった既存の不具合（compose とは無関係）

どちらも Supabase CLI の構成でも同じように起きる。

### 5-1. 下書きにした議案が、注目フラグ付きだとトップに表示される

`web/src/features/bills/server/repositories/bill-repository.ts` の `findFeaturedBillsWithContents` だけが
`publish_status = 'published'` で絞り込んでいない（同じファイルの他の取得関数はすべて絞り込んでいる）。
下書き・Coming Soon の議案でも `is_featured` が付いていれば、トップの「注目の議案」に概要ごと出る。

### 5-2. 管理画面で追加した管理者がログインできない

管理者追加（`admin/src/features/admins/server/repositories/admin-repository.ts`）は
`auth.admin.createUser` で `app_metadata.roles` を設定するだけで、`admin_profiles` の行を作らない。
C-1 以降は middleware が `admin_profiles` を見てアクセスを判定するため、GoTrue へのログインは成功するが、直後にログアウトさせられる。

---

## 6. 残っていること

- **手順6 本番データでの予行演習** — 本番（Supabase Cloud）の接続情報が要る。dump は市民のインタビュー回答を含むので、手順書の取り扱い注意に従う
- **#3 チャット・インタビューの往復** — AI Gateway のキーを入れれば確認できる。Langfuse の撤去（方針 §5 ④）が済むまでは Langfuse のキーも要る
- **本番（Supabase Cloud）の「Confirm email」設定の確認**（§4-3）
- **VPS で確かめること** — 手順書 §5 に加え、nginx の構成に応じたレート制限の再試験（§4-2）、長く動かした後のキャッシュの無効化（§4-8）
- **VPS 移行時の変更** — `images.remotePatterns` への本番ドメインの追加、standalone の起動スクリプト（§4-6）
- **SMTP を足す時** — メールでのサインアップを塞ぐ手段とメール送信のレート制限を決める（§4-3）
- §5 の不具合2件の修正
