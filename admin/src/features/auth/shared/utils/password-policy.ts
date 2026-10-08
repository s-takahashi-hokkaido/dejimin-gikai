/**
 * 管理画面のパスワードの最低文字数
 *
 * GoTrue 側の最低文字数（supabase/config.toml の minimum_password_length、
 * infra/compose.yml の GOTRUE_PASSWORD_MIN_LENGTH）と揃えること。
 * 画面で先に弾くのは、GoTrue に弾かれると招待・再設定のリンクを使い切ってしまうため。
 */
export const PASSWORD_MIN_LENGTH = 12;

/** GoTrue（bcrypt）が扱えるパスワードの上限（バイト） */
export const PASSWORD_MAX_BYTES = 72;

/** 新しいパスワードを確かめる。問題があればメッセージを返す */
export function validateNewPassword(
  password: string,
  confirmation: string
): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `パスワードは${PASSWORD_MIN_LENGTH}文字以上で入力してください`;
  }
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) {
    return "パスワードが長すぎます（半角で72文字まで）";
  }
  if (password !== confirmation) {
    return "確認用のパスワードが一致しません";
  }
  return null;
}
