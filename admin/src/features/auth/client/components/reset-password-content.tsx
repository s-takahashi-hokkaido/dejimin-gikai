import { AuthCard } from "./auth-card";
import { ResetPasswordForm } from "./reset-password-form";

/** パスワード再設定メールを申し込む画面 */
export function ResetPasswordContent() {
  return (
    <AuthCard
      title="パスワードの再設定"
      description={
        <p>
          登録しているメールアドレスを入力してください。新しいパスワードを設定するためのリンクをメールで送ります。
        </p>
      }
    >
      <ResetPasswordForm />
    </AuthCard>
  );
}
