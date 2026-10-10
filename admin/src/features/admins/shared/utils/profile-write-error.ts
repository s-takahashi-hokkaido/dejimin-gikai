/**
 * admin_profiles への書き込みが Postgres に弾かれた時の表示文言
 *
 * 画面の選択肢から選ぶので普段は起きないが、選んでいる間に会派が削除された場合などに出る。
 */
const PROFILE_WRITE_ERROR_MESSAGES = new Map<string, string>([
  // foreign_key_violation（faction_id の会派が無い）
  [
    "23503",
    "選択した会派が見つかりません。画面を読み込み直してから選び直してください",
  ],
  // check_violation（admin_profiles_faction_required）
  ["23514", "議員は所属会派を選択してください（議員以外は会派を持てません）"],
  // invalid_text_representation（faction_id が UUID でない）
  ["22P02", "所属会派の指定が正しくありません"],
]);

/** Postgres のエラーコードを表示用の文言にする。知らないコードは null */
export function toProfileWriteErrorMessage(
  code: string | undefined | null
): string | null {
  return (code && PROFILE_WRITE_ERROR_MESSAGES.get(code)) || null;
}
