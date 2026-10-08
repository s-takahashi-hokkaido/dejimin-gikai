import { describe, expect, it } from "vitest";
import { normalizeDateInput } from "./normalize-date-input";

describe("normalizeDateInput", () => {
  it("YYYY-MM-DD はそのまま返す（タイムゾーン変換で日付をずらさない）", () => {
    expect(normalizeDateInput("2026-09-02")).toBe("2026-09-02");
  });

  it("空文字は null に変換する", () => {
    expect(normalizeDateInput("")).toBeNull();
  });

  it("空白のみの文字列も null に変換する", () => {
    expect(normalizeDateInput("   ")).toBeNull();
  });

  it("undefined は null に変換する", () => {
    expect(normalizeDateInput(undefined)).toBeNull();
  });

  it("null はそのまま null を返す", () => {
    expect(normalizeDateInput(null)).toBeNull();
  });

  it("前後の空白は取り除く", () => {
    expect(normalizeDateInput(" 2026-10-08 ")).toBe("2026-10-08");
  });
});
