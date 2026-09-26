#!/usr/bin/env bash
#
# Supabase（セルフホスト）の日次バックアップ。/etc/cron.d/gikai から毎日 3:00 に呼ぶ。
#
# 取るのは検証結果 §4-5 で復元まで確かめた3点で、形式もそこと同じにしてある。
#   migrations.txt … どのマイグレーションまで当たった DB のデータか（復元時に同じ版のスキーマを作るため）
#   data.sql       … データのみの pg_dump（マイグレーション管理表と storage.buckets は除く）
#   storage.tar    … 画像ファイルの実体。xattr（user.supabase.*）ごと。落とすと復元した画像が
#                    application/octet-stream で返る
#
# 手順:   docs/20260924_1404_さくらVPS立ち上げ手順.md 手順11
# 復元:   docs/20260922_2100_ローカルdocker-compose検証結果.md §4-5（infra/scripts/README.md にも要約）
#
# 出力先は /srv/backups/<YYYYMMDD>/。**市民のインタビュー回答・利用者のメールアドレスと
# パスワードハッシュが入る**ので、/srv/backups は 700、ファイルは 600 にする。
#
# 環境変数で上から変えられる（既定値は VPS の配置）:
#   SUPABASE_DIR    compose.yml と .env と volumes がある場所（既定 /srv/supabase）
#   BACKUP_ROOT     バックアップの置き場所（既定 /srv/backups）
#   BACKUP_RETENTION_DAYS  これより古いディレクトリを消す（既定 14）
#   TAR_IMAGE       xattr 付きの tar を持つイメージ（既定 ubuntu:24.04。alpine の busybox tar は xattr 非対応）

# -E（errtrace）が無いと、関数の中で落ちた時に ERR トラップが動かない
set -Eeuo pipefail
# 生成するファイルとディレクトリを持ち主だけに見せる（dir 700 / file 600）
umask 077

readonly supabase_dir="${SUPABASE_DIR:-/srv/supabase}"
readonly backup_root="${BACKUP_ROOT:-/srv/backups}"
readonly retention_days="${BACKUP_RETENTION_DAYS:-14}"
readonly tar_image="${TAR_IMAGE:-ubuntu:24.04}"
readonly compose_file="${supabase_dir}/compose.yml"

stamp="$(date +%Y%m%d)"
readonly stamp
readonly work_dir="${backup_root}/.incomplete-${stamp}"
readonly final_dir="${backup_root}/${stamp}"

# ログは stderr に出す。stdout は dump の書き出し先にリダイレクトされることがあり、
# そこにログが混ざるとバックアップのファイルが壊れる
log() {
  printf '%s %s\n' "$(date +'%Y-%m-%dT%H:%M:%S%z')" "$*" >&2
}

on_error() {
  local rc=$?
  log "ERROR: バックアップに失敗した（exit ${rc}）"
  # 途中まで書いたものは復元に使えないので残さない
  rm -rf "${work_dir}"
  exit "${rc}"
}
trap on_error ERR

compose() {
  docker compose -f "${compose_file}" "$@"
}

if [[ ! -f "${compose_file}" ]]; then
  log "ERROR: ${compose_file} が無い。SUPABASE_DIR を確かめる"
  exit 1
fi

if [[ -e "${final_dir}" ]]; then
  log "ERROR: ${final_dir} が既にある。取り直すなら先に消す"
  exit 1
fi

log "バックアップを始める: ${final_dir}"

# /srv/backups そのものの権限もここで担保する（バックアップの中身は個人情報を含む）
mkdir -p "${backup_root}"
chmod 700 "${backup_root}"
rm -rf "${work_dir}"
mkdir -p "${work_dir}"

# 1. 適用済みマイグレーションの一覧
compose exec -T db psql -U postgres -v ON_ERROR_STOP=1 -tAc \
  "select version from supabase_migrations.schema_migrations order by version" \
  >"${work_dir}/migrations.txt"
log "migrations.txt: $(wc -l <"${work_dir}/migrations.txt") 件"

# 2. データのみの dump。スキーマはマイグレーションで作り直すので入れない
compose exec -T db pg_dump -U supabase_admin --data-only --no-owner \
  -n public -n auth -n storage \
  -T auth.schema_migrations -T storage.migrations -T storage.buckets \
  >"${work_dir}/data.sql"
log "data.sql: $(du -h "${work_dir}/data.sql" | cut -f1)"

# 3. 画像ファイルの実体。xattr ごと取る。
#    コンテナのユーザー所有のファイルを読むため root で動かし、出来た tar の持ち主と権限を戻す
docker run --rm \
  -v "${supabase_dir}/volumes:/v:ro" \
  -v "${work_dir}:/b" \
  "${tar_image}" \
  bash -c "tar --xattrs --xattrs-include='user.*' -C /v -cf /b/storage.tar storage \
    && chown $(id -u):$(id -g) /b/storage.tar && chmod 600 /b/storage.tar"
log "storage.tar: $(du -h "${work_dir}/storage.tar" | cut -f1)"

# 3点揃ってから日付のディレクトリにする（途中で落ちた分を復元に使わせない）
mv "${work_dir}" "${final_dir}"

# 古いものを消す。日付のディレクトリと、落ちた時の残骸だけを対象にする
find "${backup_root}" -mindepth 1 -maxdepth 1 -type d \
  \( -name '20[0-9][0-9][0-9][0-9][0-9][0-9]' -o -name '.incomplete-*' \) \
  -mtime "+${retention_days}" -print -exec rm -rf {} +

log "バックアップを終えた: ${final_dir}"
