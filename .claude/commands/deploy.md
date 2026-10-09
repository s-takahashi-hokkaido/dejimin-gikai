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

# 本番で人が先に当てるもの（マイグレーションと infra/）
git diff origin/main...origin/develop --name-only -- supabase/migrations infra
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

2. で見つけたマイグレーション・`infra/` の変更は、**ワークフローより先に**当てる。
手順は `docs/20261010_0845_アカウント管理の本番リリース手順.md` §3。

本番 DB・VPS への操作は人が行う（Claude のセッションからは環境の安全チェックで止められることがある）。
どちらも無い、または済んだら:

```bash
gh workflow run "Deploy VPS" -R s-takahashi-hokkaido/dejimin-gikai --ref main
gh run watch -R s-takahashi-hokkaido/dejimin-gikai
```

### 6. 完了報告

```
デプロイ完了: main ブランチにマージし、Deploy VPS（main）で VPS に反映しました
```

マイグレーションや infra/ の変更が残っていてワークフローを流していない場合は、その旨と残りの作業を報告する。
