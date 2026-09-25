import { describe, expect, it } from "vitest";
import { isFlagEnabled } from "./is-flag-enabled";

describe("isFlagEnabled", () => {
  it("未設定なら false", () => {
    expect(isFlagEnabled(undefined)).toBe(false);
  });

  it("空文字なら false", () => {
    expect(isFlagEnabled("")).toBe(false);
    expect(isFlagEnabled("  ")).toBe(false);
  });

  it('"true" / "1" なら true', () => {
    expect(isFlagEnabled("true")).toBe(true);
    expect(isFlagEnabled("1")).toBe(true);
  });

  it("大文字小文字と前後の空白は無視する", () => {
    expect(isFlagEnabled("TRUE")).toBe(true);
    expect(isFlagEnabled(" True ")).toBe(true);
  });

  it("それ以外の値は false", () => {
    expect(isFlagEnabled("false")).toBe(false);
    expect(isFlagEnabled("0")).toBe(false);
    expect(isFlagEnabled("yes")).toBe(false);
    expect(isFlagEnabled("on")).toBe(false);
  });
});
