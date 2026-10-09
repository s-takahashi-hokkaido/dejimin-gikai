import { AuthApiError, AuthRetryableFetchError } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { toPasswordResetErrorMessage } from "./password-reset-error";

describe("toPasswordResetErrorMessage", () => {
  it("エラーが無ければ null", () => {
    expect(toPasswordResetErrorMessage(null)).toBeNull();
    expect(toPasswordResetErrorMessage(undefined)).toBeNull();
  });

  it("利用者の回線ごとの上限は出す（登録の有無と関係ない）", () => {
    expect(
      toPasswordResetErrorMessage(
        new AuthApiError(
          "Request rate limit reached",
          429,
          "over_request_rate_limit"
        )
      )
    ).toContain("リクエストが多すぎます");
  });

  it("通信の失敗は出す（登録の有無と関係ない）", () => {
    expect(
      toPasswordResetErrorMessage(
        new AuthRetryableFetchError("Failed to fetch", 0)
      )
    ).toContain("通信に失敗しました");
  });

  it("同じアドレスへの送信間隔の制限は出さない（登録済みのアドレスでだけ起きる）", () => {
    expect(
      toPasswordResetErrorMessage(
        new AuthApiError(
          "For security purposes, you can only request this after 60 seconds.",
          429,
          "over_email_send_rate_limit"
        )
      )
    ).toBeNull();
  });

  it("メールの送信の失敗は出さない（登録済みのアドレスでだけ起きる）", () => {
    expect(
      toPasswordResetErrorMessage(
        new AuthApiError(
          "Error sending recovery email",
          500,
          "unexpected_failure"
        )
      )
    ).toBeNull();
  });
});
