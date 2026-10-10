/** /update-password に来るメールのリンクの種類（GoTrue の verifyOtp の type） */
export const EMAIL_LINK_TYPES = ["invite", "recovery"] as const;

export type EmailLinkType = (typeof EMAIL_LINK_TYPES)[number];

export function isEmailLinkType(value: unknown): value is EmailLinkType {
  return (
    typeof value === "string" &&
    (EMAIL_LINK_TYPES as readonly string[]).includes(value)
  );
}

/**
 * GoTrue のトークンハッシュとして受け付ける形
 *
 * 実際は 16進の SHA-224（PKCE のときは先頭に pkce_）だが、形式が変わってもリンクが
 * 使えなくならないよう緩く確かめる。中身の正しさは GoTrue の検証に任せる
 */
const TOKEN_HASH_PATTERN = /^[A-Za-z0-9_-]{1,200}$/;

/** /update-password で行うこと */
export type UpdatePasswordMode =
  /** 招待メールから。パスワードを設定してアカウントを有効にする */
  | { kind: "invite"; tokenHash: string }
  /** パスワード再設定メールから */
  | { kind: "recovery"; tokenHash: string }
  /** ログイン中のパスワード変更（再設定の途中で失敗した時のやり直しも含む） */
  | { kind: "change" }
  /** リンクが壊れている、またはログインしていない */
  | { kind: "invalid" };

/**
 * /update-password の検索パラメータとログイン状態から、画面で行うことを決める
 *
 * メールのリンクには token_hash と type が付く。この画面を開いただけではトークンを
 * 使わない（メールのリンクを先読みするセキュリティ製品に消費されないように、
 * パスワードを送信した時に初めて検証する）。
 */
export function resolveUpdatePasswordMode({
  tokenHash,
  type,
  hasSession,
}: {
  tokenHash: string | string[] | undefined;
  type: string | string[] | undefined;
  hasSession: boolean;
}): UpdatePasswordMode {
  if (tokenHash === undefined) {
    return hasSession ? { kind: "change" } : { kind: "invalid" };
  }

  if (
    typeof tokenHash !== "string" ||
    !TOKEN_HASH_PATTERN.test(tokenHash) ||
    !isEmailLinkType(type)
  ) {
    return { kind: "invalid" };
  }

  return { kind: type, tokenHash };
}
