/** AI の1日の利用上限に達したときの文面（API の 429 応答） */
export const DAILY_COST_LIMIT_MESSAGE =
  "本日の利用上限に達しました。明日0時以降に再度お試しください。";

/** 上限到達以外のエラー時の文面 */
export const GENERIC_ERROR_MESSAGE =
  "エラーが発生しました。しばらく待ってから再度お試しください。";

const USER_FACING_MESSAGES: ReadonlySet<string> = new Set([
  DAILY_COST_LIMIT_MESSAGE,
  GENERIC_ERROR_MESSAGE,
]);

/**
 * エラーメッセージを利用者に見せてよい文面に変換する
 *
 * API が返す既知の文面はそのまま使い、それ以外（OpenAI の生エラーや
 * ブラウザの "Failed to fetch" など）は汎用の文面に置き換える。
 */
export function toUserFacingErrorMessage(message: string | undefined): string {
  if (message !== undefined && USER_FACING_MESSAGES.has(message)) {
    return message;
  }
  return GENERIC_ERROR_MESSAGE;
}
