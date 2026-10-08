import { useState } from "react";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { requestPasswordReset } from "../../server/actions/request-password-reset";

export function useRequestPasswordReset() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** 申し込みを受け付けたメールアドレス（送信済みの表示に使う） */
  const [requestedEmail, setRequestedEmail] = useState<string | null>(null);

  const submit = async (email: string) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await requestPasswordReset({ email });
      if ("error" in result) {
        setError(result.error);
      } else {
        setRequestedEmail(email.trim());
      }
    } catch (err) {
      setError(getErrorMessage(err, "予期しないエラーが発生しました。"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return { submit, isSubmitting, error, requestedEmail };
}
