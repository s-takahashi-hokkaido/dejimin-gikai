# ホストの nginx の vhost

さくらVPS のホスト側に入れる nginx（TLS 終端）の vhost。
手順は [さくらVPS 立ち上げ手順](../../docs/20260924_1404_さくらVPS立ち上げ手順.md) の **手順9** が正。

nginx は 2 段ある。ここにあるのは **外側（ホスト）** の設定で、`infra/nginx/supabase.conf` は
compose の中の nginx（Supabase の API をパスで振り分けるゲートウェイ代わり）の設定。役割が違うので混ぜない。

```
ブラウザ ──443──→ ホストの nginx（このディレクトリ）
                   ├ gikai.ezocivic.tech       → 127.0.0.1:3004  web   (systemd)
                   ├ gikai-admin.ezocivic.tech → 127.0.0.1:3003  admin (systemd)
                   └ db.ezocivic.tech          → 127.0.0.1:8000  compose の nginx（infra/nginx/supabase.conf）
```

| ファイル | ドメイン | 上流 | Basic 認証 |
|---|---|---|---|
| `gikai.ezocivic.tech.conf` | `gikai.ezocivic.tech` | `127.0.0.1:3004`（web） | かける（公開前） |
| `gikai-admin.ezocivic.tech.conf` | `gikai-admin.ezocivic.tech` | `127.0.0.1:3003`（admin） | かける（公開前） |
| `db.ezocivic.tech.conf` | `db.ezocivic.tech` | `127.0.0.1:8000`（compose の nginx） | **かけない** |

## 置き方

nginx と証明書の道具を入れる（手順9）。

```bash
sudo apt install -y nginx certbot python3-certbot-nginx apache2-utils
```

3 つのファイルを `/etc/nginx/sites-available/` に置き、`sites-enabled/` からリンクする。
手順7 の `rsync -av --exclude volumes --exclude .env infra/ ezocivic-vps1:/srv/supabase/` を済ませていれば、
VPS の `/srv/supabase/host-nginx/` に同じものがある。

```bash
for f in gikai.ezocivic.tech.conf gikai-admin.ezocivic.tech.conf db.ezocivic.tech.conf; do
  sudo cp "/srv/supabase/host-nginx/$f" /etc/nginx/sites-available/
  sudo ln -sfn "/etc/nginx/sites-available/$f" "/etc/nginx/sites-enabled/$f"
done
```

## 公開前の Basic 認証

`gikai` と `gikai-admin` は、`auth_basic` を **server ブロック全体** にかけている。
web にも Basic 認証はあるが、画面（HTML）にしか効かず `/api/chat` などは素通しになる
（`web/src/middleware.ts` の `_isHtmlRequest`）ため、公開前は nginx で全パスを塞ぐ。

パスワードファイルを作る（2 つの vhost で同じ `/etc/nginx/htpasswd-gikai` を使う）。

```bash
sudo htpasswd -c /etc/nginx/htpasswd-gikai <ユーザー名>   # 2 人目以降は -c を付けない
```

`db` にはかけない。ブラウザの supabase-js は別オリジンの API に認証情報を付けないので、
かけると画面から Supabase を呼べなくなる。`db` は RLS（ポリシー無し＝全拒否）で守られている。

**公開する時（T1 の判断の後）** は、2 つの vhost の次の 2 行を消して reload する。

```nginx
auth_basic "EZO CIVIC (preview)";
auth_basic_user_file /etc/nginx/htpasswd-gikai;
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## TLS（certbot）

この 3 つは **80 番だけで待ち受ける素の設定**にしてある（証明書がまだ無い状態でも `nginx -t` が通る）。
`listen 443 ssl` と `ssl_certificate`、http から https への転送は certbot が書き込む。

```bash
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d gikai.ezocivic.tech -d gikai-admin.ezocivic.tech -d db.ezocivic.tech \
  -m <連絡用メールアドレス> --agree-tos --redirect
sudo certbot renew --dry-run      # 自動更新（systemd timer）が通るか
```

> certbot は `/etc/nginx/sites-available/` のファイルを**直接書き換える**ので、certbot を当てた後は
> サーバー上のファイルとこのリポジトリの中身がずれる。ここを直して持っていく時は、上から `cp` で
> 上書きせず差分を当てるか、`cp` した後に `certbot --nginx` を当て直す（`--redirect` も付け直す）。

http-01 の応答は certbot が自分の server ブロックで返すので Basic 認証には掛からないが、
webroot 方式に切り替えても 401 にならないよう `/.well-known/acme-challenge/` は認証の外に出してある。

## IPv6

3 つとも `listen [::]:80;` をコメントアウトで置いてある。IPv6 で待ち受けるかは公開前に決める
（手順書 手順6・§7 の未決事項）。**有効にするなら 3 つ揃えて**、DNS の AAAA レコードと同時に入れる。
nginx を直さずに AAAA だけ足すと、IPv6 で来た利用者が繋がらない。

## 変更したら

```bash
sudo nginx -t && sudo systemctl reload nginx
```

`nginx -t` が通らないまま reload しても、nginx は古い設定で動き続ける（落ちはしない）。
