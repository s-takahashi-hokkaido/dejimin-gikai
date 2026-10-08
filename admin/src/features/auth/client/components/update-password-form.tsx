"use client";

import type { FormEvent } from "react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PASSWORD_MIN_LENGTH } from "../../shared/utils/password-policy";
import {
  type ActiveUpdatePasswordMode,
  useUpdatePassword,
} from "../hooks/use-update-password";
import { FormError } from "./form-error";

type UpdatePasswordFormProps = {
  mode: ActiveUpdatePasswordMode;
};

export function UpdatePasswordForm({ mode }: UpdatePasswordFormProps) {
  const passwordId = useId();
  const confirmationId = useId();
  const hintId = useId();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const { submit, isSubmitting, error } = useUpdatePassword(mode);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit(password, confirmation);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={passwordId}>新しいパスワード</Label>
        <Input
          id={passwordId}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isSubmitting}
          aria-describedby={hintId}
          required
        />
        <p id={hintId} className="text-xs text-gray-500">
          {PASSWORD_MIN_LENGTH}
          文字以上。ほかのサービスで使っているパスワードは避けてください。
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={confirmationId}>新しいパスワード（確認）</Label>
        <Input
          id={confirmationId}
          type="password"
          autoComplete="new-password"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          disabled={isSubmitting}
          required
        />
      </div>

      {error && <FormError message={error} />}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "設定中..." : "パスワードを設定する"}
      </Button>
    </form>
  );
}
