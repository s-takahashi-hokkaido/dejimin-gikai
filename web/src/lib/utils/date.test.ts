import { describe, expect, it, vi } from "vitest";

import {
  formatDate,
  formatDateJST,
  formatDateWithDots,
  formatDateWithWeekday,
  getJapanTime,
  getJstDateParts,
} from "./date";

describe("formatDate", () => {
  it("formats a date string in Japanese locale", () => {
    expect(formatDate("2025-01-15")).toBe("2025年1月15日");
  });

  it("formats a date with double-digit month and day", () => {
    expect(formatDate("2025-12-31")).toBe("2025年12月31日");
  });

  it("formats an ISO datetime string", () => {
    expect(formatDate("2025-03-05T10:00:00Z")).toBe("2025年3月5日");
  });

  it("formats a JST-midnight timestamptz as the JST date regardless of runtime timezone", () => {
    // 2026-06-30T00:00:00+09:00 = 2026-06-29T15:00:00Z（UTC暦日では前日）
    expect(formatDate("2026-06-30T00:00:00+09:00")).toBe("2026年6月30日");
  });

  it("returns an empty string for an invalid date string", () => {
    expect(formatDate("not-a-date")).toBe("");
  });
});

describe("formatDateWithWeekday", () => {
  it("formats a date with a short weekday", () => {
    expect(formatDateWithWeekday("2026-10-07T10:00:00+09:00")).toBe(
      "2026年10月7日(水)"
    );
  });

  it("uses the JST date and weekday for early-morning JST times", () => {
    // 2026-10-08T08:00:00+09:00 = 2026-10-07T23:00:00Z（UTC暦日では前日の水曜）
    expect(formatDateWithWeekday("2026-10-08T08:00:00+09:00")).toBe(
      "2026年10月8日(木)"
    );
  });

  it("returns an empty string for an invalid date string", () => {
    expect(formatDateWithWeekday("not-a-date")).toBe("");
  });
});

describe("formatDateWithDots", () => {
  it("formats a date with dot separator without zero-padding", () => {
    expect(formatDateWithDots("2025-10-01")).toBe("2025.10.1");
  });

  it("formats single-digit month and day without padding", () => {
    expect(formatDateWithDots("2025-01-05")).toBe("2025.1.5");
  });

  it("formats double-digit month and day", () => {
    expect(formatDateWithDots("2025-12-31")).toBe("2025.12.31");
  });

  it("formats a JST-midnight timestamptz as the JST date regardless of runtime timezone", () => {
    // 2026-06-30T00:00:00+09:00 = 2026-06-29T15:00:00Z（UTC暦日では前日）
    expect(formatDateWithDots("2026-06-30T00:00:00+09:00")).toBe("2026.6.30");
  });

  it("returns an empty string for an invalid date string", () => {
    expect(formatDateWithDots("not-a-date")).toBe("");
  });
});

describe("getJstDateParts", () => {
  it("returns year, month and day as numbers", () => {
    expect(getJstDateParts("2026-02-15")).toEqual({
      year: 2026,
      month: 2,
      day: 15,
    });
  });

  it("returns the JST date for a timestamp that is the previous day in UTC", () => {
    // 2027-01-01T00:30:00+09:00 = 2026-12-31T15:30:00Z
    expect(getJstDateParts("2027-01-01T00:30:00+09:00")).toEqual({
      year: 2027,
      month: 1,
      day: 1,
    });
  });

  it("returns null for an invalid date string", () => {
    expect(getJstDateParts("not-a-date")).toBeNull();
  });
});

describe("formatDateJST", () => {
  it("formats a date in JST with slash separator and zero-padding", () => {
    expect(formatDateJST("2026-02-12T00:00:00+09:00")).toBe("2026/02/12");
  });

  it("converts UTC midnight to JST next day correctly", () => {
    // 2026-02-11T15:00:00Z = 2026-02-12T00:00:00+09:00
    expect(formatDateJST("2026-02-11T15:00:00Z")).toBe("2026/02/12");
  });

  it("zero-pads single-digit month and day", () => {
    expect(formatDateJST("2025-01-05T12:00:00+09:00")).toBe("2025/01/05");
  });
});

describe("getJapanTime", () => {
  it("returns a Date object", () => {
    const result = getJapanTime();
    expect(result).toBeInstanceOf(Date);
  });

  it("returns a date based on Asia/Tokyo timezone", () => {
    const fakeDate = new Date("2025-01-15T00:00:00Z");
    vi.setSystemTime(fakeDate);

    const result = getJapanTime();
    // UTC 00:00 = JST 09:00
    expect(result.getHours()).toBe(9);

    vi.useRealTimers();
  });
});
