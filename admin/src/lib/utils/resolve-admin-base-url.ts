/**
 * admin が自分自身を HTTP で呼ぶときのベースURL（どちらも使えない時の既定値）
 */
export const ADMIN_BASE_URL_FALLBACK = "http://localhost:3001";

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

  // origin だとサブパス付きのURLでパスが落ちるので、元の文字列から末尾スラッシュだけ落とす
  return trimmed.replace(/\/+$/, "");
}

/**
 * admin が自分自身の API route を呼ぶときのベースURLを決める。
 *
 * トピック分析は Server Action / API route から admin 自身を HTTP で呼ぶ。
 * 公開前の VPS はホストの nginx が admin の全パスに Basic 認証をかけるため、
 * 公開URL（`NEXT_PUBLIC_APP_URL`）で自分を呼ぶと 401 で弾かれて解析が進まない。
 * nginx を経由しない内部URL（例: `http://127.0.0.1:3003`）が設定されていればそちらを優先する。
 *
 * `NEXT_PUBLIC_APP_URL` 側を内部URLに変えないのは、`NEXT_PUBLIC_*` がビルド時に
 * JS へ埋め込まれる値で、ビルド成果物を配る先ごとに変えられないため。
 *
 * @param internalUrl nginx を通さない内部URL（`ADMIN_INTERNAL_URL`）
 * @param publicUrl 公開URL（`NEXT_PUBLIC_APP_URL`）
 * @returns 末尾スラッシュを落としたベースURL。どちらも使えなければ既定値
 */
export function resolveAdminBaseUrl(
  internalUrl: string | undefined | null,
  publicUrl: string | undefined | null
): string {
  return (
    normalizeBaseUrl(internalUrl) ??
    normalizeBaseUrl(publicUrl) ??
    ADMIN_BASE_URL_FALLBACK
  );
}
