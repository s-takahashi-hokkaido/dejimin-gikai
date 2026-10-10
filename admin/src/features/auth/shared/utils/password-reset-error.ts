import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { getAuthErrorCode, toAuthErrorMessage } from "./auth-error-message";

/**
 * パスワード再設定の申し込みで GoTrue が返したエラーのうち、画面に出すもの（出さないものは null）
 *
 * 登録済みのメールアドレスでだけ起きるエラー（同じアドレスへの送信間隔の制限・メールの送信の失敗）を
 * そのまま出すと、登録の有無が分かってしまう。登録の無いアドレスには GoTrue が何もせず 200 を返すので、
 * 区別がつかないよう、利用者の回線ごとの上限と通信の失敗だけを出し、ほかは送った時と同じ表示にする。
 */
export function toPasswordResetErrorMessage(error: unknown): string | null {
  if (!error) {
    return null;
  }
  if (getAuthErrorCode(error) === "over_request_rate_limit") {
    return toAuthErrorMessage(
      "over_request_rate_limit",
      "リクエストが多すぎます。しばらく時間をおいてからやり直してください"
    );
  }
  if (isAuthRetryableFetchError(error)) {
    return "通信に失敗しました。しばらく時間をおいてからやり直してください";
  }
  return null;
}
