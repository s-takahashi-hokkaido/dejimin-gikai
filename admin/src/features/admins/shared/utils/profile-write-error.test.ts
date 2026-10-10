import { describe, expect, it } from "vitest";
import { toProfileWriteErrorMessage } from "./profile-write-error";

describe("toProfileWriteErrorMessage", () => {
  it("会派が無い（外部キー違反）", () => {
    expect(toProfileWriteErrorMessage("23503")).toContain(
      "選択した会派が見つかりません"
    );
  });

  it("議員の会派が無い（CHECK 制約違反）", () => {
    expect(toProfileWriteErrorMessage("23514")).toContain(
      "議員は所属会派を選択してください"
    );
  });

  it("会派の ID が UUID でない", () => {
    expect(toProfileWriteErrorMessage("22P02")).toBe(
      "所属会派の指定が正しくありません"
    );
  });

  it("知らないコード・コード無しは null", () => {
    expect(toProfileWriteErrorMessage("23505")).toBeNull();
    expect(toProfileWriteErrorMessage(undefined)).toBeNull();
    expect(toProfileWriteErrorMessage(null)).toBeNull();
    expect(toProfileWriteErrorMessage("")).toBeNull();
  });
});
