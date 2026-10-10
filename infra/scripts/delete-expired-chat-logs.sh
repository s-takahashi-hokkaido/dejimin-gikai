#!/usr/bin/env bash
#
# 保存期間（既定 90 日）を過ぎた AI チャットの会話ログを消す。/etc/cron.d/gikai から毎日 3:30 に呼ぶ。
#
# 消すのは public.chat_logs で、実体は DB 関数 public.delete_expired_chat_logs()。
# 定義は supabase/migrations/20260923140000_move_langfuse_to_db.sql。
# 関数は anon / authenticated から execute を revoke してあるので、postgres（superuser）で呼ぶ。
#
# 手順:   docs/20260930_2104_さくらVPS構築手順.md 手順11
# 方針:   docs/20260912_1528_プロジェクト方針とやりたいこと整理.md §5 ④（保存期間 90 日）
#
# プライバシーポリシーの「90日で自動的に削除」は、この cron が動いていることが前提。
#
# 環境変数で上から変えられる（既定値は VPS の配置）:
#   SUPABASE_DIR    compose.yml と .env がある場所（既定 /srv/supabase）
#   CHAT_RETENTION_DAYS  保存期間の日数。空なら DB 関数の既定（90 日）を使う

# -E（errtrace）が無いと、関数の中で落ちた時に ERR トラップが動かない
set -Eeuo pipefail

readonly supabase_dir="${SUPABASE_DIR:-/srv/supabase}"
readonly retention_days="${CHAT_RETENTION_DAYS:-}"
readonly compose_file="${supabase_dir}/compose.yml"

# ログは stderr に出す。stdout は dump の書き出し先にリダイレクトされることがあり、
# そこにログが混ざるとバックアップのファイルが壊れる
log() {
  printf '%s %s\n' "$(date +'%Y-%m-%dT%H:%M:%S%z')" "$*" >&2
}

on_error() {
  local rc=$?
  log "ERROR: 会話ログの削除に失敗した（exit ${rc}）"
  exit "${rc}"
}
trap on_error ERR

if [[ ! -f "${compose_file}" ]]; then
  log "ERROR: ${compose_file} が無い。SUPABASE_DIR を確かめる"
  exit 1
fi

if [[ -n "${retention_days}" ]]; then
  # SQL に埋めるので、正の整数以外は受け付けない
  if [[ ! "${retention_days}" =~ ^[1-9][0-9]*$ ]]; then
    log "ERROR: CHAT_RETENTION_DAYS は正の整数で指定する: ${retention_days}"
    exit 1
  fi
  readonly sql="select public.delete_expired_chat_logs(${retention_days});"
else
  readonly sql="select public.delete_expired_chat_logs();"
fi

deleted="$(docker compose -f "${compose_file}" exec -T db \
  psql -U postgres -v ON_ERROR_STOP=1 -tAc "${sql}")"

log "期限切れの会話ログを ${deleted} 件削除した"
