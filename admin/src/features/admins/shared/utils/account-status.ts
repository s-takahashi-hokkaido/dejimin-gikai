import type { AccountStatus } from "../types";

/**
 * アカウントの状態を Auth ユーザーのメールアドレスの確認日時から決める
 *
 * 招待したアカウントは未確認で作り、招待メールのリンクを確かめた時に確認済みになる。
 * 一覧の表示と招待メールの再送の可否の両方で使う（食い違わないように1か所で決める）。
 */
export function getAccountStatus(
  emailConfirmedAt: string | null | undefined
): AccountStatus {
  return emailConfirmedAt ? "active" : "invited";
}
