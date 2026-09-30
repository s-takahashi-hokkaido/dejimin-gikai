# VPS の定期処理スクリプト

さくらVPS で cron から動かすスクリプト。呼び出しの定義は [`infra/cron/gikai`](../cron/gikai)（`/etc/cron.d/gikai` に置く）。
手順は [さくらVPS 構築手順](../../docs/20260930_2104_さくらVPS構築手順.md) の **手順11** が正。

| スクリプト | 時刻 | 何をするか |
|---|---|---|
| `backup.sh` | 毎日 3:00 | `/srv/backups/<YYYYMMDD>/` に `migrations.txt` / `data.sql` / `storage.tar` を取り、14日より古いディレクトリを消す |
| `delete-expired-chat-logs.sh` | 毎日 3:30 | 保存期間（90日）を過ぎた AI チャットの会話ログを消す（`public.delete_expired_chat_logs()`） |

どちらも `/srv/supabase/compose.yml` の compose に対して `docker compose exec` する。置き場所を変える時は
環境変数 `SUPABASE_DIR` で渡す（手元で試す時にも使える）。

## 置き方

手順7 の `rsync -av --exclude volumes --exclude .env infra/ ezocivic-vps1:/srv/supabase/` を済ませていれば、
VPS の `/srv/supabase/scripts/` と `/srv/supabase/cron/` に同じものがある（実行権限も付いたまま届く）。

```bash
# バックアップの置き場所。中身に個人情報が入るので 700、持ち主は cron を動かすユーザー
sudo mkdir -p /srv/backups
sudo chown ubuntu: /srv/backups
sudo chmod 700 /srv/backups

# cron の定義
sudo install -o root -g root -m 644 /srv/supabase/cron/gikai /etc/cron.d/gikai

# 手で1回流して確かめる（cron を待たない）
/srv/supabase/scripts/backup.sh
/srv/supabase/scripts/delete-expired-chat-logs.sh
ls -la /srv/backups/"$(date +%Y%m%d)"
```

- スクリプトを動かすユーザーは `docker` グループに入っていること（手順5 の `usermod -aG docker ubuntu`）
- cron から動かした分のログは syslog（journald）に入る: `journalctl -t gikai-backup -n 50`
- どちらも `set -Eeuo pipefail` で、失敗すると `ERROR:` の行を出して 0 以外の終了コードで終わる
- `backup.sh` は毎回 `pg_dump: warning: there are circular foreign-key constraints`（`prompts` と
  `prompt_versions`）を出す。**これは正常**。復元は `set session_replication_role = replica;` を付けて流すので問題にならない（下記）

## バックアップに何が入るか

「スキーマはマイグレーション、データだけ戻す」方式。3点の形式は
[ローカル docker compose 検証結果](../../docs/20260922_2100_ローカルdocker-compose検証結果.md) §4-5 で
復元まで確かめたものと同じにしてある。

| ファイル | 中身 | なぜ必要か |
|---|---|---|
| `migrations.txt` | `supabase_migrations.schema_migrations` の版の一覧 | 復元時に**同じ版のスキーマ**を作るため。新しいスキーマに古いデータを流すと壊れる |
| `data.sql` | `public` / `auth` / `storage` のデータのみの `pg_dump`（マイグレーション管理表・`storage.buckets`・`chat_logs` は除く） | スキーマはマイグレーションで作るため |
| `storage.tar` | `volumes/storage`（画像ファイルの実体）を xattr ごと固めたもの | storage-api が Content-Type と Cache-Control を xattr（`user.supabase.*`）に持っている。落とすと復元した画像が `application/octet-stream` になる |

> **`chat_logs`（AI チャットの会話本文）はバックアップに入れない。**
> 入れると、DB から 90 日で消した会話ログがバックアップの保持期間（14日）だけ生き延び、
> プライバシーポリシーの「AI チャットのやり取りは 90 日で自動的に削除します」と食い違う。
> そのため復元しても会話ログは戻らない（分析用の一時データなので、戻せなくてよいと判断した）。
> `chat_logs` を参照する外部キーは無いので、他のテーブルの復元には影響しない。

> **`/srv/backups` の中身には、市民のインタビュー回答・利用者のメールアドレスとパスワードハッシュが入る。**
> ディレクトリは 700、ファイルは 600（スクリプトの `umask 077` と `chmod 700`）。手元に持ち出す時も置き場所に気をつける。

**VPS の中にだけ置いても、VPS が壊れたら一緒に失う。** 外への持ち出し先は構築手順 §8 の未決事項
（案 (a) 手元の WSL から毎日 `rsync` で取りに行く、案 (b) さくらのオブジェクトストレージ）。

## 復元

手順は検証結果 §4-5 の「復元」がそのまま使える（`BACKUP_DIR` を `/srv/backups/<日付>` に読み替える）。
要点だけ:

1. `docker compose down` してから `volumes/db/data` と `volumes/storage` を消す（起動中に作り直すとコンテナが古いディレクトリを見続ける）
2. `storage.tar` を `--xattrs --xattrs-include='user.*'` 付きで戻す
3. `docker compose up -d` して、**`migrations.txt` の最後の版まで**マイグレーションを流す
4. `set session_replication_role = replica;` を先に付けて `data.sql` を `supabase_admin` で流す
5. リポジトリを最新に戻して残りのマイグレーションを流す

復元の練習は**手元の compose に対して**行う（手順12 #9。VPS には戻さない）。
