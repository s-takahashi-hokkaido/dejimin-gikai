import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import type { UpdatePasswordMode } from "../../shared/utils/email-link";
import { validateNewPassword } from "../../shared/utils/password-policy";
import {
  ensureAdminAccess,
  updatePassword,
  verifyEmailLink,
} from "../lib/auth-client";

export type ActiveUpdatePasswordMode = Exclude<
  UpdatePasswordMode,
  { kind: "invalid" }
>;

export function useUpdatePassword(mode: ActiveUpdatePasswordMode) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // メールのリンクのトークンは一度しか使えない。確かめた後でパスワードの設定だけが
  // 失敗した場合はログイン済みになっているので、やり直しではトークンを使わない
  const [isLinkVerified, setIsLinkVerified] = useState(false);

  const submit = async (password: string, confirmation: string) => {
    // GoTrue に弾かれる前に画面で確かめる（弾かれるとリンクを使い切ってしまう）
    const validationError = validateNewPassword(password, confirmation);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (mode.kind !== "change" && !isLinkVerified) {
        await verifyEmailLink(mode.tokenHash, mode.kind);
        setIsLinkVerified(true);
      }
      // 管理画面の利用資格が無いアカウントにはパスワードを設定させない
      await ensureAdminAccess();
      await updatePassword(password);

      toast.success("パスワードを設定しました");
      router.push("/bills");
    } catch (err) {
      setError(getErrorMessage(err, "予期しないエラーが発生しました。"));
      setIsSubmitting(false);
    }
  };

  return { submit, isSubmitting, error };
}
