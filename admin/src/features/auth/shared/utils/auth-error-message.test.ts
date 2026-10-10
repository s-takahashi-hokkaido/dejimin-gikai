import { AuthApiError } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { getAuthErrorCode, toAuthErrorMessage } from "./auth-error-message";
import { PASSWORD_MIN_LENGTH } from "./password-policy";

describe("getAuthErrorCode", () => {
  it("GoTrue のエラーならコードを返す", () => {
    expect(
      getAuthErrorCode(
        new AuthApiError("User already registered", 422, "email_exists")
      )
    ).toBe("email_exists");
  });

  it("GoTrue のエラーでなければ undefined", () => {
    expect(getAuthErrorCode(new Error("network"))).toBeUndefined();
    expect(getAuthErrorCode({ code: "email_exists" })).toBeUndefined();
    expect(getAuthErrorCode(undefined)).toBeUndefined();
  });
});

describe("toAuthErrorMessage", () => {
  it("リンクの期限切れ・使用済みを案内する", () => {
    expect(toAuthErrorMessage("otp_expired", "失敗")).toContain(
      "有効期限が切れているか、すでに使われています"
    );
  });

  it("弱いパスワードには最低文字数を案内する", () => {
    expect(toAuthErrorMessage("weak_password", "失敗")).toContain(
      `${PASSWORD_MIN_LENGTH}文字以上`
    );
  });

  it("登録済みのメールアドレスはどちらのコードでも同じ文言にする", () => {
    expect(toAuthErrorMessage("email_exists", "失敗")).toBe(
      toAuthErrorMessage("user_already_exists", "失敗")
    );
  });

  it("メール送信の上限を案内する", () => {
    expect(toAuthErrorMessage("over_email_send_rate_limit", "失敗")).toContain(
      "メールの送信数が上限"
    );
  });

  it("知らないコードは fallback を返す", () => {
    expect(toAuthErrorMessage("unexpected_failure", "失敗しました")).toBe(
      "失敗しました"
    );
  });

  it("コードが無ければ fallback を返す", () => {
    expect(toAuthErrorMessage(undefined, "失敗しました")).toBe("失敗しました");
    expect(toAuthErrorMessage(null, "失敗しました")).toBe("失敗しました");
    expect(toAuthErrorMessage("", "失敗しました")).toBe("失敗しました");
  });

  it("Object のプロパティ名を渡しても fallback を返す", () => {
    expect(toAuthErrorMessage("toString", "失敗しました")).toBe("失敗しました");
  });
});
