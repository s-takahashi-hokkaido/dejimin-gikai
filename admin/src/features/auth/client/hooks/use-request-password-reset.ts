import { useState } from "react";
import { validateEmail } from "@/features/admins/shared/utils/validate-email";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { buildUpdatePasswordUrl } from "../../shared/utils/auth-paths";
import { toPasswordResetErrorMessage } from "../../shared/utils/password-reset-error";
import { sendPasswordResetEmail } from "../lib/password-reset-client";

export function useRequestPasswordReset() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** 申し込みを受け付けたメールアドレス（送信済みの表示に使う） */
  const [requestedEmail, setRequestedEmail] = useState<string | null>(null);

  const submit = async (input: string) => {
    const email = input.trim().toLowerCase();
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    // 招待メールと同じリンク先（GoTrue の許可リストに入れてある URL）にする
    const redirectTo = buildUpdatePasswordUrl(
      process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin
    );
    if (!redirectTo) {
      setError("パスワード再設定メールを送れませんでした");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const resetError = await sendPasswordResetEmail(email, redirectTo);
      const message = toPasswordResetErrorMessage(resetError);
      if (message) {
        setError(message);
        return;
      }
      if (resetError) {
        // 登録の有無が分かるエラーは画面に出さず、送った時と同じ表示にする
        console.error("Password reset request error:", resetError);
      }
      setRequestedEmail(email);
    } catch (err) {
      setError(getErrorMessage(err, "予期しないエラーが発生しました。"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return { submit, isSubmitting, error, requestedEmail };
}
