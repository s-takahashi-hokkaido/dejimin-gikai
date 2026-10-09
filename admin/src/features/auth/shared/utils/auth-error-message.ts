import { isAuthError } from "@supabase/supabase-js";
import { PASSWORD_MIN_LENGTH } from "./password-policy";

/**
 * GoTrue のエラーコード（AuthError.code）ごとの表示文言
 *
 * コードの一覧: @supabase/auth-js の lib/error-codes.ts
 */
const AUTH_ERROR_MESSAGES = new Map<string, string>([
  [
    "otp_expired",
    "リンクの有効期限が切れているか、すでに使われています。もう一度メールを送ってもらってください",
  ],
  [
    "weak_password",
    `パスワードが弱すぎます。${PASSWORD_MIN_LENGTH}文字以上にしてください`,
  ],
  ["same_password", "今と同じパスワードは設定できません"],
  ["email_exists", "このメールアドレスは既に登録されています"],
  ["user_already_exists", "このメールアドレスは既に登録されています"],
  ["email_address_invalid", "有効なメールアドレスを入力してください"],
  [
    "over_email_send_rate_limit",
    "メールの送信数が上限に達しました。しばらく時間をおいてからやり直してください",
  ],
  [
    "over_request_rate_limit",
    "リクエストが多すぎます。しばらく時間をおいてからやり直してください",
  ],
  [
    "session_not_found",
    "ログインの有効期限が切れました。もう一度メールのリンクから開き直してください",
  ],
  ["user_banned", "このアカウントは利用が停止されています"],
]);

/** 例外が GoTrue のエラーならエラーコードを返す */
export function getAuthErrorCode(error: unknown): string | undefined {
  return isAuthError(error) ? error.code : undefined;
}

/** GoTrue のエラーコードを表示用の文言にする。知らないコードは fallback */
export function toAuthErrorMessage(
  code: string | undefined | null,
  fallback: string
): string {
  return (code && AUTH_ERROR_MESSAGES.get(code)) || fallback;
}
