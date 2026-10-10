# infra/

さくらVPS（Ubuntu 24.04 / 2GB）に載せるための設定ファイル置き場。
全体の手順は [docs/20260930_2104_さくらVPS構築手順.md](../docs/20260930_2104_さくらVPS構築手順.md)、
ローカルでの検証結果は [docs/20260922_2100_ローカルdocker-compose検証結果.md](../docs/20260922_2100_ローカルdocker-compose検証結果.md) を参照。

| パス | 中身 | VPS 上の置き場所 |
|---|---|---|
| `compose.yml` / `.env.example` | セルフホスト Supabase（db / auth / rest / storage / nginx） | `/srv/gikai/infra/`（リポジトリを clone して使う） |
| `nginx/supabase.conf` | 上記 compose のゲートウェイ nginx の設定 | compose がマウントする |
| `email-templates/` | 管理画面の招待・パスワード再設定メールの本文。GoTrue が compose の nginx（中だけの 8088 番）から取る。ローカルの Supabase CLI も `supabase/config.toml` から同じファイルを使う | compose がマウントする |
| `db/roles.sql` / `db/jwt.sql` | db コンテナの初期化スクリプト | compose がマウントする |
| `systemd/gikai-web.service` | web（Next.js standalone）の systemd unit | `/etc/systemd/system/gikai-web.service` |
| `systemd/gikai-admin.service` | admin（Next.js standalone）の systemd unit | `/etc/systemd/system/gikai-admin.service` |
| `sudoers/gikai-deploy` | デプロイが `systemctl restart` だけを sudo できるようにする | `/etc/sudoers.d/gikai-deploy` |

ホストの nginx の vhost（`infra/host-nginx/`。Basic 認証・TLS・web / admin へのリバースプロキシ）は
別の PR で追加する。手順書 手順9 を参照。

デプロイは GitHub Actions の **Deploy VPS**（[`.github/workflows/deploy_vps.yml`](../.github/workflows/deploy_vps.yml)）が行う。
ビルド（Actions）→ `.next/standalone` に `.next/static` と `public` をコピー → `rsync --delete` → `systemctl restart`。

---

## 1. デプロイの流れ

```
GitHub Actions (Node 22)                          さくらVPS (Node 22)
  pnpm install --frozen-lockfile
  pnpm --filter web build     ← NEXT_PUBLIC_* は Variables から
  pnpm --filter admin build      （ビルド時に JS へ埋め込まれる）
  cp -r <app>/.next/static    → <app>/.next/standalone/<app>/.next/static
  cp -r <app>/public          → <app>/.next/standalone/<app>/public
  rsync -az --delete  web/.next/standalone/   → /srv/gikai/web/    （= /srv/gikai/web/web/server.js）
  rsync -az --delete  admin/.next/standalone/ → /srv/gikai/admin/  （= /srv/gikai/admin/admin/server.js）
  ssh sudo systemctl restart gikai-web gikai-admin
```

モノレポなので standalone の中に `web/` / `admin/` の一段が入る（検証結果 §4-6）。
`systemd` unit の `WorkingDirectory` がその一段深いパスになっているのはこのため。

`.next/static` と `public` は standalone に含まれないので、ビルドの後に手でコピーする必要がある。

**秘密情報は GitHub に置かない。** サービスロールキー・OpenAI のキー・`REVALIDATE_SECRET` は
VPS の env ファイル（下記）にだけ置く。ビルドでは DB に接続しないので、これらはビルドに不要
（web・admin の両方で、サービスロールキー無しでビルドが通ることを確認済み）。

---

## 2. VPS 側の準備（人が1度だけ行う）

Node 22 と rsync が入っていること（手順書 手順5）。

```bash
node -v            # v22.x
which rsync || sudo apt install -y rsync
```

### 2-1. ディレクトリ

```bash
sudo install -d -o ubuntu -g ubuntu -m 755 /srv/gikai
sudo install -d -o ubuntu -g ubuntu -m 755 /srv/gikai/web /srv/gikai/admin
```

### 2-2. 実行時の環境変数

`/srv/gikai/web.env` と `/srv/gikai/admin.env` を作る（`chmod 600`、所有者 `ubuntu`）。
systemd の `EnvironmentFile` は `KEY=VALUE` を1行ずつ読む（クォートは不要。値に `#` を含めないこと）。

```bash
sudo -u ubuntu tee /srv/gikai/web.env > /dev/null <<'EOF'
NODE_ENV=production
PORT=3004
HOSTNAME=127.0.0.1
SUPABASE_URL=https://db.ezocivic.tech
NEXT_PUBLIC_SUPABASE_URL=https://db.ezocivic.tech
SUPABASE_SERVICE_ROLE_KEY=<手順7 の値>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<手順7 の値>
NEXT_PUBLIC_WEB_URL=https://gikai.ezocivic.tech
ADMIN_URL=https://gikai-admin.ezocivic.tech
REVALIDATE_SECRET=<openssl rand -hex 32。admin と同じ値>
OPENAI_API_KEY=<本番用のキー>
AI_GLOBAL_DAILY_COST_LIMIT_USD=1
CHAT_DAILY_COST_LIMIT_USD=0.5
INTERVIEW_DAILY_COST_LIMIT_USD=0.5
EOF
chmod 600 /srv/gikai/web.env
```

```bash
sudo -u ubuntu tee /srv/gikai/admin.env > /dev/null <<'EOF'
NODE_ENV=production
PORT=3003
HOSTNAME=127.0.0.1
SUPABASE_URL=https://db.ezocivic.tech
NEXT_PUBLIC_SUPABASE_URL=https://db.ezocivic.tech
SUPABASE_SERVICE_ROLE_KEY=<手順7 の値>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<手順7 の値>
NEXT_PUBLIC_WEB_URL=https://gikai.ezocivic.tech
NEXT_PUBLIC_APP_URL=https://gikai-admin.ezocivic.tech
ADMIN_INTERNAL_URL=http://127.0.0.1:3003
WEB_INTERNAL_URL=http://127.0.0.1:3004
REVALIDATE_SECRET=<web と同じ値>
OPENAI_API_KEY=<本番用のキー>
EOF
chmod 600 /srv/gikai/admin.env
```

どちらのアプリがどの変数を読むかを、コード（`process.env` の参照）と `.env.example` で突き合わせた結果
（手順書 手順10 の宿題）:

| 変数 | web | admin | 備考 |
|---|---|---|---|
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | ○ | ○ | `packages/supabase` の `createAdminClient()` が読む |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ○ | ○ | **ビルド時にも必要**（未設定だとビルドが失敗する） |
| `NEXT_PUBLIC_WEB_URL` | ○ | ○ | ビルド時にも必要 |
| `NEXT_PUBLIC_APP_URL` | ✕ | ○ | **web は読まない**（手順書 手順10 の表を修正） |
| `ADMIN_URL` | ○ | ✕ | 未設定だと `http://localhost:3001` になる |
| `ADMIN_INTERNAL_URL` | ✕ | ○ | `http://127.0.0.1:3003`。トピック分析が admin 自身を呼ぶ時の宛先（PR #56）。未設定だと `NEXT_PUBLIC_APP_URL` に送り、Basic 認証で 401 になる |
| `WEB_INTERNAL_URL` | ✕ | ○ | `http://127.0.0.1:3004`。admin → web の `/api/revalidate` の宛先（PR #51）。未設定だと `NEXT_PUBLIC_WEB_URL` に送り、Basic 認証で 401 になる |
| `REVALIDATE_SECRET` | ○ | ○ | 両方に同じ値 |
| `OPENAI_API_KEY` | ○ | ○ | コードには現れない。AI SDK が `process.env` から直接読む |
| `AI_GLOBAL_DAILY_COST_LIMIT_USD` / `CHAT_DAILY_COST_LIMIT_USD` / `INTERVIEW_DAILY_COST_LIMIT_USD` | ○ | ✕ | 未設定なら 5 / 0.5 / 0.5 |
| `PORT` / `HOSTNAME` | ○ | ○ | standalone の `server.js` が読む。web 3004 / admin 3003、`127.0.0.1` |
| `NODE_ENV` | ○ | ○ | `production` |
| `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD` | ○ | ✕ | VPS では**設定しない**。Basic 認証はホストの nginx で掛ける |
| `ADMIN_BASIC_AUTH_USER` / `ADMIN_BASIC_AUTH_PASSWORD` | ✕ | ○ | 同上 |
| `ADMIN_ENABLE_CLAUDE_CLI` / `CLAUDE_CLI_PATH` | ✕ | ○ | VPS では**設定しない**（Claude CLI を使う機能はローカル専用） |

`NEXT_PUBLIC_*` はビルド時に JS へ埋め込まれるので、**env ファイルだけ直してもブラウザ側には反映されない。**
値を変えたら GitHub の Variables も直して、デプロイをやり直す。

> **`NEXT_PUBLIC_WEB_URL` / `NEXT_PUBLIC_APP_URL` は、サーバー間の呼び出しにも使われている。**
> admin → web のキャッシュ無効化（`/api/revalidate`）と、admin が自分自身を呼ぶトピック分析がこれを見る。
> ホストの nginx で Basic 認証を掛けている間、公開 URL 宛てのこの呼び出しは 401 になる。
> `NEXT_PUBLIC_*` はビルド時に埋め込まれるため env ファイルでは逃がせないので、
> 内部宛て（`http://127.0.0.1:3004` など）に送るためのサーバー専用の変数が別に必要になる。
> web への revalidate は `WEB_INTERNAL_URL`（PR #51）、トピック分析の自分呼びは `ADMIN_INTERNAL_URL`（PR #56）で対応済み。
> **admin.env にこの2つが無いと、どちらも 401 になる。**

### 2-3. systemd unit と sudoers

VPS にはリポジトリを置かない方針（手順書 手順8）なので、手元から送ってから置く。

```bash
# 手元（リポジトリ直下）
scp infra/systemd/gikai-web.service infra/systemd/gikai-admin.service infra/sudoers/gikai-deploy ezocivic-vps1:/tmp/
```

```bash
# VPS（ssh -t ezocivic-vps1 で入って。/tmp に送った3つを置く）
cd /tmp
sudo install -o root -g root -m 0644 gikai-web.service   /etc/systemd/system/
sudo install -o root -g root -m 0644 gikai-admin.service /etc/systemd/system/
sudo install -o root -g root -m 0440 gikai-deploy        /etc/sudoers.d/gikai-deploy
sudo visudo -cf /etc/sudoers.d/gikai-deploy      # 構文確認（必須）
rm gikai-web.service gikai-admin.service gikai-deploy

sudo systemctl daemon-reload
sudo systemctl enable gikai-web gikai-admin      # 起動は成果物を置いた後
```

VPS にリポジトリを clone してある場合は、その場所で次のようにしてもよい。

```bash
sudo install -o root -g root -m 0644 infra/systemd/gikai-web.service   /etc/systemd/system/
sudo install -o root -g root -m 0644 infra/systemd/gikai-admin.service /etc/systemd/system/
sudo install -o root -g root -m 0440 infra/sudoers/gikai-deploy        /etc/sudoers.d/gikai-deploy
sudo visudo -cf /etc/sudoers.d/gikai-deploy      # 構文確認（必須）

sudo systemctl daemon-reload
sudo systemctl enable gikai-web gikai-admin      # 起動は成果物を置いた後
```

まだ `server.js` が無いので、この時点で `--now` を付けると
`Cannot find module '/srv/gikai/web/web/server.js'` で失敗する。最初の起動は次の節のデプロイで行う。

デプロイ後に自動起動まで含めて確かめる:

```bash
sudo systemctl enable --now gikai-web gikai-admin
systemctl status gikai-web gikai-admin
journalctl -u gikai-web -f
```

unit を直した時は `sudo systemctl daemon-reload` を忘れないこと。

`MemoryHigh=450M` / `MemoryMax=600M` は cgroup の制限で、`MemoryMax` を超えると SIGKILL される。
落ちるようなら `journalctl -u gikai-web` に `oom` が出る。env ファイルに
`NODE_OPTIONS=--max-old-space-size=400` を足すと、V8 側の上限も揃えられる。

> **sudoers について。** `gikai-deploy` は実際に効く。クラウドイメージでよくある
> `/etc/sudoers.d/90-cloud-init-users`（`ubuntu ALL=(ALL) NOPASSWD:ALL`）は、
> さくらのVPS の Ubuntu 24.04 標準OSインストールには**無い**
> （`/etc/sudoers.d/` には `README` のみ。2026-09-27 に実機で確認）。
> `ubuntu` の `sudo` は既定でパスワードを要求するので、このファイルを置くと
> デプロイ鍵で通るのは `systemctl restart gikai-web gikai-admin` だけになる。
>
> 設置したら必ず確かめること:
>
> ```bash
> ssh -t ezocivic-vps1 'sudo -n -l'   # この1行だけが NOPASSWD で出れば正しい
> ```
>
> 別のイメージや別のVPSに移す時は、この前提が変わっていないか確認する。
> さらに絞るなら、デプロイ専用のユーザーを作って公開鍵をそちらに置き、sudoers の1行目を
> そのユーザー名にする（`/srv/gikai` の所有者と `User=` も合わせる）。

---

## 3. GitHub 側に登録するもの（人が1度だけ行う）

### 3-1. デプロイ用の SSH 鍵を作る

**手元（WSL）で**専用の鍵を作り、公開鍵を VPS に足して、秘密鍵を GitHub Secrets に入れる。
普段使いの鍵は使わない。

```bash
ssh-keygen -t ed25519 -C "github-actions-gikai-deploy" -f ~/.ssh/gikai_deploy -N ""
ssh-copy-id -i ~/.ssh/gikai_deploy.pub ubuntu@<IPv4>
ssh -i ~/.ssh/gikai_deploy ubuntu@<IPv4> 'echo ok'      # 通ることを確認
```

`known_hosts` は、**ワークフローが接続する名前**（`VPS_HOST` に入れる値）で取る。
IP で登録して名前で接続すると照合に失敗する。

```bash
ssh-keyscan -t ed25519 gikai.ezocivic.tech
```

SSH のポートを 22 から変えている場合は、**ポート付きで取る**。
ssh は非標準ポートの鍵を `[ホスト名]:ポート` という行で探すため、ポート無しの行では照合できない。

```bash
ssh-keyscan -p 2222 -t ed25519 gikai.ezocivic.tech   # → [gikai.ezocivic.tech]:2222 ssh-ed25519 ...
```

### 3-2. Variables（Settings → Secrets and variables → Actions → Variables）

秘密ではない値。anon キーはブラウザに配られる値なので Variables で構わない。

| 名前 | 値の例 | 用途 |
|---|---|---|
| `VPS_HOST` | `gikai.ezocivic.tech` | rsync / ssh の接続先。DNS を引く前は IPv4 でもよい |
| `VPS_USER` | `ubuntu` | 接続ユーザー。sudoers の1行目と揃えること |
| `VPS_SSH_PORT` | （未設定なら 22） | SSH のポートを変えた場合だけ登録する |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://db.ezocivic.tech` | ビルド時に埋め込む |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 手順7 で作った anon の JWT | ビルド時に埋め込む |
| `NEXT_PUBLIC_WEB_URL` | `https://gikai.ezocivic.tech` | ビルド時に埋め込む |
| `NEXT_PUBLIC_APP_URL` | `https://gikai-admin.ezocivic.tech` | ビルド時に埋め込む（admin が読む） |

### 3-3. Secrets（同じ画面の Secrets）

| 名前 | 値 |
|---|---|
| `VPS_SSH_PRIVATE_KEY` | `~/.ssh/gikai_deploy`（秘密鍵）の中身。`-----BEGIN` から末尾の改行まで丸ごと |
| `VPS_SSH_KNOWN_HOSTS` | `ssh-keyscan` の出力。秘密ではないが、VPS のアドレスをログに出さないため Secrets に置く |

**登録しないもの**: `SUPABASE_SERVICE_ROLE_KEY`、`OPENAI_API_KEY`、`REVALIDATE_SECRET`、
DB のパスワード、`JWT_SECRET`。これらは VPS の env ファイルにだけ置く。

**repository レベルに登録する。** リポジトリには Environment（Preview / Production）もあるが、
`deploy_vps.yml` は `environment:` を指定していないので、Environment に登録した値は読まれない。

`gh` で登録する場合。このリポジトリはリモートが複数（origin / upstream / team-mirai）あるので、
`-R` を付けないと `multiple remotes detected` で止まるか、別のリポジトリに登録してしまう。

```bash
R=s-takahashi-hokkaido/dejimin-gikai
gh variable set VPS_HOST -R $R --body "gikai.ezocivic.tech"
gh variable set VPS_USER -R $R --body "ubuntu"
gh variable set NEXT_PUBLIC_SUPABASE_URL -R $R --body "https://db.ezocivic.tech"
gh variable set NEXT_PUBLIC_SUPABASE_ANON_KEY -R $R --body "<anon の JWT>"
gh variable set NEXT_PUBLIC_WEB_URL -R $R --body "https://gikai.ezocivic.tech"
gh variable set NEXT_PUBLIC_APP_URL -R $R --body "https://gikai-admin.ezocivic.tech"

gh secret set VPS_SSH_PRIVATE_KEY -R $R < ~/.ssh/gikai_deploy
ssh-keyscan -t ed25519 gikai.ezocivic.tech | gh secret set VPS_SSH_KNOWN_HOSTS -R $R

gh variable list -R $R && gh secret list -R $R   # 登録を確かめる
```

---

## 4. デプロイする

本番に出すのは **`main` だけ**。`develop` の変更は、`develop` → `main` の PR（`/deploy`）をマージしてから流す。
マイグレーションや `infra/` の変更を含む時は、先にそちらを済ませる
（順番は [構築手順](../docs/20260930_2104_さくらVPS構築手順.md) §5「デプロイ」）。

> **`main` は PR #62（2026-09-29）のまま止まっている。** VPS には `develop` から流した新しい版が載っているので、
> 最初の `/deploy` で `develop` を `main` に入れるまでは、`main` でこのワークフローを流さない（古い版に戻ってしまう）。
> 最初のリリースは [本番リリース手順](../docs/20261010_0845_アカウント管理の本番リリース手順.md) のとおりに行う。

```bash
gh workflow run "Deploy VPS" -R s-takahashi-hokkaido/dejimin-gikai --ref main
gh run watch -R s-takahashi-hokkaido/dejimin-gikai
```

（GitHub の画面からは Actions → Deploy VPS → Run workflow。**Use workflow from を `main` に切り替える**。
既定のブランチ（`develop`）のまま実行すると最初のステップで止まる）

ワークフローは最初に、実行したブランチが `main` かと、Variables / Secrets の登録漏れを
確かめて止まる（`--ref` の指定違いで別のコードが本番に乗らないようにするため）。
最後に、`<app>.env` の `PORT` を読んで応答が返るまで最大60秒待ち、2xx / 3xx が返ることを確かめる。

公開前は手動実行のみ（`workflow_dispatch`）。`main` への push で自動デプロイにする場合は、
`deploy_vps.yml` の先頭にコメントで残してある `push:` を有効にする。

### デプロイ中の見え方と、戻したい時

`rsync --delete` は動いているプロセスの下でファイルを差し替える。Next.js はルートごとの
チャンクを初回アクセス時に読むので、**転送中（web 130MB / admin 90MB ぶん）にまだ読んでいない
ページへアクセスすると 500 になることがある。** 公開後もこの形で続けるなら、
リリースごとに別ディレクトリへ送って symlink を差し替える形に変えるほうがよい。

`--delete` なので**前の版は VPS に残らない。** 戻したい時は、戻したいコミットを `main` に入れて
デプロイをやり直す（ワークフローは `main` からしか実行できない）。

### うまくいかない時

| 症状 | 見るところ |
|---|---|
| 18 秒ほどで `exit code 1`（画面には理由が出ない） | ログの `Check deploy ref, variables and secrets` に `GitHub に登録されていません: ...` が出ていれば §3 の登録漏れ。repository レベルに登録したか |
| rsync が `Permission denied` | `/srv/gikai/{web,admin}` の所有者が `ubuntu` か |
| `sudo: a password is required` | §2-3 を済ませたか（最初のデプロイの前に要る）。`/etc/sudoers.d/gikai-deploy` の有無・権限（0440）・`VPS_USER` と1行目のユーザーが一致しているか |
| `Host key verification failed` | `VPS_SSH_KNOWN_HOSTS` を `VPS_HOST` と同じ名前で取り直す。SSH のポートを変えている場合は `ssh-keyscan -p <port>` で取る（§3-1） |
| 起動しない | `journalctl -u gikai-web -n 50`。env ファイルの読み取り権限、`WorkingDirectory` の `server.js` の有無 |
| メモリで落ちる（`MemoryMax`） | `systemctl status gikai-web` の Memory。実測は web 230MiB / admin 190MiB（検証結果 §4-7） |
| ブラウザ側の Supabase の URL が古い | `NEXT_PUBLIC_*` はビルド時に埋め込まれる。Variables を直してデプロイをやり直す |
