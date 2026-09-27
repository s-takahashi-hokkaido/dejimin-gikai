/**
 * Web側のキャッシュ無効化エンドポイントのパス
 * web/src/app/api/revalidate/route.ts と同期を保つこと
 */
export const REVALIDATE_PATH = "/api/revalidate";

/**
 * http / https の絶対URLとして使える値なら、末尾のスラッシュを落として返す。
 * 未設定・空文字・スキーム無し・不正な値は null。
 */
function normalizeBaseUrl(raw: string | undefined | null): string | null {
  if (!raw) return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }

  return trimmed.replace(/\/+$/, "");
}

/**
 * revalidate（Web側のキャッシュ無効化）の送信先URLを組み立てる。
 *
 * 公開前の VPS では web・admin の全パスにホストの nginx で Basic 認証をかけるため、
 * 公開URL経由で `/api/revalidate` を叩くと 401 で弾かれる。
 * nginx を経由しない内部URL（例: `http://127.0.0.1:3004`）が設定されていればそちらを優先し、
 * 未設定・不正な値なら公開URLにフォールバックする（ローカル開発・Vercel は従来どおり）。
 *
 * @param internalWebUrl nginx を通さない内部URL（`WEB_INTERNAL_URL`）
 * @param publicWebUrl 公開URL（`NEXT_PUBLIC_WEB_URL`）
 * @returns 送信先URL。どちらも使えない場合は null
 */
export function buildRevalidateUrl(
  internalWebUrl: string | undefined | null,
  publicWebUrl: string | undefined | null
): string | null {
  const base =
    normalizeBaseUrl(internalWebUrl) ?? normalizeBaseUrl(publicWebUrl);

  if (!base) return null;

  return `${base}${REVALIDATE_PATH}`;
}
