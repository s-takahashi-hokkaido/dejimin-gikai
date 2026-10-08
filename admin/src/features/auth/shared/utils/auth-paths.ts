import { normalizeBaseUrl } from "@/lib/utils/resolve-admin-base-url";

export const LOGIN_PATH = "/login";

/** パスワード再設定メールを申し込む画面 */
export const RESET_PASSWORD_PATH = "/reset-password";

/** 招待・パスワード再設定メールのリンク先。新しいパスワードを設定する画面 */
export const UPDATE_PASSWORD_PATH = "/update-password";

/** ログインしていなくても開ける画面 */
const PUBLIC_AUTH_PATHS: readonly string[] = [
  LOGIN_PATH,
  RESET_PASSWORD_PATH,
  UPDATE_PASSWORD_PATH,
];

/** middleware がログインを求めずに通すパスかどうか */
export function isPublicAuthPath(pathname: string): boolean {
  return PUBLIC_AUTH_PATHS.includes(pathname);
}

/**
 * 招待メール・パスワード再設定メールのリンク先（GoTrue の redirect_to）を作る
 *
 * メールのテンプレートは {{ .RedirectTo }} にトークンを付けてリンクにする。
 * GoTrue は許可リスト（GOTRUE_URI_ALLOW_LIST / additional_redirect_urls）に無い URL を
 * サイトの URL（web）に差し替えるので、この URL を許可リストに入れておくこと。
 *
 * @param appUrl admin の公開 URL（`NEXT_PUBLIC_APP_URL`）
 * @returns 絶対 URL。appUrl が未設定・不正なら null
 */
export function buildUpdatePasswordUrl(
  appUrl: string | undefined | null
): string | null {
  const base = normalizeBaseUrl(appUrl);
  return base ? `${base}${UPDATE_PASSWORD_PATH}` : null;
}
