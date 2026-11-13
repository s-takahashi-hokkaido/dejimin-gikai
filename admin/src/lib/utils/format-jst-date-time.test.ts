import { describe, expect, it } from "vitest";
import { formatJstDateTime } from "./format-jst-date-time";

describe("formatJstDateTime", () => {
  it("日本時間で表示する", () => {
    expect(formatJstDateTime("2026-11-12T15:05:00+00:00")).toBe(
      "2026/11/13 00:05"
    );
  });

  it("無ければ - を返す", () => {
    expect(formatJstDateTime(null)).toBe("-");
  });
});
