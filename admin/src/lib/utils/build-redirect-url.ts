// ホスト名（任意でポート）か、[] で囲んだ IPv6 アドレス（任意でポート）だけを許す。
// パスや userinfo（`@`）が混ざった値でリダイレクト先を乗っ取られないようにする
const HOST_PATTERN = /^(?:[a-z0-9.-]+|\[[0-9a-f:.]+\])(?::\d{1,5})?$/i;

type BuildRedirectUrlOptions = {
  /** リクエストの Host ヘッダー */
  host: string | null;
  /** リクエストの X-Forwarded-Proto ヘッダー */
  forwardedProto: string | null;
  /** Host ヘッダーが使えない時に基準にする URL（通常は request.nextUrl） */
  fallbackUrl: string | URL;
};

function resolveProtocol(
  forwardedProto: string | null,
  fallbackProtocol: string
): string {
  // プロキシが多段だと "https, http" のように連なるので、利用者に近い先頭を見る
  const first = forwardedProto?.split(",")[0]?.trim().toLowerCase();
  if (first === "https" || first === "http") return `${first}:`;
  return fallbackProtocol;
}

/**
 * middleware からのリダイレクト先を、利用者がアクセスしてきたオリジンで組み立てる。
 *
 * standalone の server.js では request.nextUrl が Host ヘッダーではなく
 * HOSTNAME:PORT から作られ、さらに 127.0.0.1 が localhost に書き換えられる。
 * nextUrl のまま絶対 URL を作ると、nginx の裏では https://localhost:3003/login の
 * ような利用者から届かない URL に飛ばしてしまうため、Host ヘッダーを使う。
 *
 * X-Forwarded-Host は使わない。ホストの nginx は Host を `$host` で上書きするが
 * X-Forwarded-Host は利用者の送った値を素通しするため、任意のドメインへの
 * リダイレクト（オープンリダイレクト）に使えてしまう。
 *
 * @param pathname リダイレクト先のパス（例: `/login`）
 * @returns 絶対 URL。Host ヘッダーが無い・不正な時は fallbackUrl のオリジンを使う
 */
export function buildRedirectUrl(
  pathname: string,
  { host, forwardedProto, fallbackUrl }: BuildRedirectUrlOptions
): string {
  const fallback = new URL(fallbackUrl);
  const fallbackRedirect = new URL(pathname, fallback.origin).toString();
  const trimmedHost = host?.trim();

  if (!trimmedHost || !HOST_PATTERN.test(trimmedHost)) {
    return fallbackRedirect;
  }

  const protocol = resolveProtocol(forwardedProto, fallback.protocol);
  try {
    return new URL(pathname, `${protocol}//${trimmedHost}`).toString();
  } catch {
    // 形は合っていても URL にならない値（範囲外のポート・不正な IPv6）で
    // middleware ごと 500 にしない
    return fallbackRedirect;
  }
}
