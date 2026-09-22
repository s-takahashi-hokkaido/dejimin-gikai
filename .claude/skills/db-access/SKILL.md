---
name: db-access
description: 本番DB・ローカルDB接続の規約。DBデータを参照・更新する際に必ず確認すること。
---

# DB接続規約

## 重要：北海道版の本番DBは未確定

- 北海道版の本番DBは、さくらVPS への移行（[docs/20260912_1528_プロジェクト方針とやりたいこと整理.md](../../../docs/20260912_1528_プロジェクト方針とやりたいこと整理.md) の塊B）で決まる予定。**本番DBを参照・更新する前に、接続先を必ずユーザーに確認する**
- このリポジトリに `.env.production` は無い（`.env.production.example` だけ）。Vercel 上の本番デプロイがどのDBにつながっているかも、リポジトリからは分からない
- 以前ここに書いてあった本番 URL（`https://lxphthejcjrmxhigxvzy.supabase.co`）と「ローカルの Admin は `.env.production` で本番DBに接続している」という記載は、upstream（福岡市版）から引き継いだもので、北海道版用に設定された値ではない（福岡市版でも upstream #85 で別の値に訂正されている）。使わない

## ローカルDB

- `.env` の `SUPABASE_URL` はローカル Supabase（`http://127.0.0.1:...`）。`npx supabase start` で起動する
- データ投入の試しと web での表示確認はローカルで行う

## DBを操作する際のルール

- 管理画面で登録できるもの（議案・解説・会派賛否・会期・会派・委員会・タグ）は、管理画面から登録する
- 管理画面が無いもの（一般質問・記者会見・予算など）を REST や SQL で書き込むときは、接続先をユーザーに確認し、内容の承認を得てから書き込む
- AI生成コンテンツは CLAUDE.md「AI生成コンテンツのDB更新ルール」に従い、書き込む前にユーザーに提示する
- REST API でアクセスする場合は、接続先の `SUPABASE_URL` と `SUPABASE_SERVICE_ROLE_KEY` を使う
- DBを直接書き換えたときは、管理画面経由のキャッシュ無効化が走らない。web の `/api/revalidate` を呼ぶ（各データ更新スキルを参照）

## 接続例

```bash
# council_sessions 一覧取得
curl -s "$SUPABASE_URL/rest/v1/council_sessions?select=*" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```
