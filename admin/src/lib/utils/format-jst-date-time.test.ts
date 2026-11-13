import { describe, expect, it } from "vitest";
import { formatJstDateTime } from "./format-jst-date-time";

describe("formatJstDateTime", () => {
  it("日本時間の年月日・時刻にする（UTC の夜は翌日になる）", () => {
    expect(formatJstDateTime("2026-11-12T15:05:00+00:00")).toBe(
      "2026/11/13 00:05"
    );
    expect(formatJstDateTime("2026-10-08T20:33:00Z")).toBe("2026/10/09 05:33");
  });

  it("無ければ - を返す", () => {
    expect(formatJstDateTime(null)).toBe("-");
    expect(formatJstDateTime("")).toBe("-");
  });
});
