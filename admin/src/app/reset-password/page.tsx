import { AuthCard } from "@/features/auth/client/components/auth-card";
import { ResetPasswordForm } from "@/features/auth/client/components/reset-password-form";

export default function ResetPasswordPage() {
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
