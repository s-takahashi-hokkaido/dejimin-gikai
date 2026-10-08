"use server";

import { validateEmail } from "@/features/admins/shared/utils/validate-email";
import { createStatelessAuthClient } from "@/lib/supabase/stateless-auth";
import { toAuthErrorMessage } from "../../shared/utils/auth-error-message";
import { buildUpdatePasswordUrl } from "../../shared/utils/auth-paths";

/**
 * パスワード再設定メールを申し込む（ログイン前の画面から呼ぶ）
 *
 * 登録の無いメールアドレスでも成功として返す（GoTrue もメールを送らずに 200 を返す）。
 * 登録の有無を画面から確かめられないようにするため。
 * 未確認（招待メールを使う前）のアカウントも、再設定メールのリンクで有効にできる。
 */
export async function requestPasswordReset(input: {
  email: string;
}): Promise<{ success: true } | { error: string }> {
  const email = input.email.trim().toLowerCase();
  const emailError = validateEmail(email);
  if (emailError) {
    return { error: emailError };
  }

  const redirectTo = buildUpdatePasswordUrl(process.env.NEXT_PUBLIC_APP_URL);
  if (!redirectTo) {
    console.error("Password reset: NEXT_PUBLIC_APP_URL is not set");
    return {
      error:
        "パスワード再設定メールを送れませんでした（サーバーの設定の不備）。運営者にお問い合わせください",
    };
  }

  const { error } = await createStatelessAuthClient().resetPasswordForEmail(
    email,
    { redirectTo }
  );
  if (error) {
    console.error("Password reset request error:", error);
    return {
      error: toAuthErrorMessage(
        error.code,
        "パスワード再設定メールを送れませんでした。しばらく時間をおいてからやり直してください"
      ),
    };
  }

  return { success: true };
}
