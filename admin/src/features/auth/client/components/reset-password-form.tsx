"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import type { FormEvent } from "react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LOGIN_PATH } from "../../shared/utils/auth-paths";
import { useRequestPasswordReset } from "../hooks/use-request-password-reset";
import { FormError } from "./form-error";

function BackToLoginLink() {
  return (
    <p className="text-center text-sm">
      <Link href={LOGIN_PATH} className="text-blue-600 hover:underline">
        ログイン画面に戻る
      </Link>
    </p>
  );
}

export function ResetPasswordForm() {
  const emailId = useId();
  const [email, setEmail] = useState("");
  const { submit, isSubmitting, error, requestedEmail } =
    useRequestPasswordReset();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit(email);
  };

  if (requestedEmail) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          <MailCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {requestedEmail}
            が登録されている場合は、パスワード再設定のメールを送りました。メールのリンクから新しいパスワードを設定してください（リンクの有効期限は24時間です）。
          </p>
        </div>
        <p className="text-sm text-gray-600">
          メールが届かない場合は、迷惑メールのフォルダを確認してください。それでも見つからない場合は、運営者にお問い合わせください。
        </p>
        <BackToLoginLink />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={emailId}>メールアドレス</Label>
        <Input
          id={emailId}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isSubmitting}
          required
        />
      </div>

      {error && <FormError message={error} />}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "送信中..." : "再設定メールを送る"}
      </Button>

      <BackToLoginLink />
    </form>
  );
}
