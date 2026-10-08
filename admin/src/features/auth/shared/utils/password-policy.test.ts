import { describe, expect, it } from "vitest";
import {
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN_LENGTH,
  validateNewPassword,
} from "./password-policy";

describe("validateNewPassword", () => {
  const valid = "a".repeat(PASSWORD_MIN_LENGTH);

  it("最低文字数ちょうどで、確認用と一致すれば null を返す", () => {
    expect(validateNewPassword(valid, valid)).toBeNull();
  });

  it("最低文字数に1文字足りなければエラーを返す", () => {
    const short = "a".repeat(PASSWORD_MIN_LENGTH - 1);
    expect(validateNewPassword(short, short)).toBe(
      `パスワードは${PASSWORD_MIN_LENGTH}文字以上で入力してください`
    );
  });

  it("空文字はエラーを返す", () => {
    expect(validateNewPassword("", "")).not.toBeNull();
  });

  it("確認用と一致しなければエラーを返す", () => {
    expect(validateNewPassword(valid, `${valid}x`)).toBe(
      "確認用のパスワードが一致しません"
    );
  });

  it("上限のバイト数ちょうどなら通す", () => {
    const longest = "a".repeat(PASSWORD_MAX_BYTES);
    expect(validateNewPassword(longest, longest)).toBeNull();
  });

  it("上限のバイト数を超えるとエラーを返す", () => {
    const tooLong = "a".repeat(PASSWORD_MAX_BYTES + 1);
    expect(validateNewPassword(tooLong, tooLong)).toBe(
      "パスワードが長すぎます（半角で72文字まで）"
    );
  });

  it("全角文字はバイト数で上限を数える", () => {
    // 1文字3バイトなので 25文字で 75バイト
    const multibyte = "あ".repeat(25);
    expect(validateNewPassword(multibyte, multibyte)).toBe(
      "パスワードが長すぎます（半角で72文字まで）"
    );
  });

  it("長さの確認を一致の確認より先に行う", () => {
    expect(validateNewPassword("short", "different")).toBe(
      `パスワードは${PASSWORD_MIN_LENGTH}文字以上で入力してください`
    );
  });
});
