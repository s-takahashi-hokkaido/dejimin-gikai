import { describe, expect, it } from "vitest";
import { formatAccountDateTime } from "./format-account-date-time";

describe("formatAccountDateTime", () => {
  it("日本時間の年月日・時刻にする（UTC の夜は翌日になる）", () => {
    expect(formatAccountDateTime("2026-10-08T20:33:00Z")).toBe(
      "2026/10/09 05:33"
    );
  });

  it("無ければ - を返す", () => {
    expect(formatAccountDateTime(null)).toBe("-");
    expect(formatAccountDateTime("")).toBe("-");
  });
});
