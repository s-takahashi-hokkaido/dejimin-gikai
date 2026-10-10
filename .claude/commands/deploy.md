---
description: "developからmainへのデプロイPRを作成・マージする"
---

## タスク

develop ブランチから main ブランチへのデプロイPRを作成し、確認後にマージします。

### 1. 事前確認

```bash
# 最新の状態をfetch
git fetch origin develop main

# develop と main の差分コミットを確認
git log origin/main..origin/develop --oneline
```

差分コミットがない場合は「デプロイする変更がありません」と報告して終了。

### 2. 差分の詳細表示

```bash
# コミット一覧（詳細）
git log origin/main..origin/develop --pretty=format:"- %h %s (%an)"

# 変更ファイルの統計
git diff origin/main...origin/develop --stat

# 本番で人が先に当てるもの（マイグレーションと infra/。README などの .md は除く）
git diff origin/main...origin/develop --name-only -- supabase/migrations infra ':(exclude)*.md'
```

差分の内容をユーザーに報告：
- コミット数
- 変更ファイル数
- 主な変更内容の要約
- マイグレーション・`infra/` の変更の有無（あれば、5. でワークフローより先に当てる必要があることを伝える）

### 3. デプロイPRの作成

PRタイトルは「本番デプロイ MM/DD HH:MM」の形式（現在日時を使用）。

```bash
gh pr create \
  --base main \
  --head develop \
  --title "本番デプロイ $(date '+%m/%d %H:%M')" \
  --body "$(cat <<'EOF'
## デプロイ内容

<コミット一覧を箇条書きで記載>

## 変更ファイル数

<変更ファイル数を記載>
EOF
)"
```

PRのURLを表示。

### 4. マージ実行

```bash
# 通常マージ（admin権限でマージコミット作成）
gh pr merge --merge --admin
```

### 5. 本番（さくらVPS）に反映する

main にマージしただけでは VPS は変わらない。Deploy VPS ワークフローは `main` からしか実行できない（手動実行のみ）。

2. で見つけたマイグレーション・`infra/` の変更は、**ワークフローより先に**当てる（手順書 `docs/20260930_2104_さくらVPS構築手順.md`）。

| 変更 | 当て方 |
|---|---|
| `supabase/migrations/` | 手順8-1・8-2（トンネルと `export`）の後、`main` を checkout して `npx supabase migration up --include-all --db-url "$PROD_DB_URL"`（手順8-3） |
| `infra/` | §5「`infra/` を直した時」の表。`compose.yml`・`nginx/` だけでなく、`host-nginx/`・`systemd/`・`cron/` は置き直しが要る |

本番 DB・VPS への操作は人が行う（Claude のセッションからは環境の安全チェックで止められることがある）。
どちらも無い、または済んだら、Deploy VPS を流して結果を待つ:

```bash
R=s-takahashi-hokkaido/dejimin-gikai
since=$(date -u +%Y-%m-%dT%H:%M:%SZ)
gh workflow run "Deploy VPS" -R $R --ref main

# 今流した run の ID を取る（一覧に出るまで数秒かかる。前回の run を拾わないよう、流した時刻より後のものに絞る）
for i in $(seq 1 10); do
  run_id=$(gh run list -R $R --workflow "Deploy VPS" --branch main --event workflow_dispatch -L 1 \
    --json databaseId,createdAt -q ".[] | select(.createdAt >= \"$since\") | .databaseId")
  [ -n "$run_id" ] && break
  sleep 3
done

# 失敗したら 0 以外で終わる（--exit-status が無いと失敗しても 0 で終わる）
gh run watch "$run_id" -R $R --exit-status
```

失敗したら `gh run view "$run_id" -R $R --log-failed | tail -30` で原因を見る（手順書 手順10-4 の表）。

### 6. 完了報告

```
デプロイ完了: main ブランチにマージし、Deploy VPS（main）で VPS に反映しました
```

マイグレーションや infra/ の変更が残っていてワークフローを流していない場合は、その旨と残りの作業を報告する。
