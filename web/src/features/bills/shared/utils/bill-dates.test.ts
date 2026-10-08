import { describe, expect, it } from "vitest";
import {
  resolveDecidedDate,
  resolveSubmittedDate,
  submittedDateSortKey,
} from "./bill-dates";

describe("resolveSubmittedDate", () => {
  it("submitted_date があればそれを返す", () => {
    expect(
      resolveSubmittedDate({
        submitted_date: "2026-09-02",
        published_at: "2026-09-04T00:00:00+09:00",
      })
    ).toBe("2026-09-02");
  });

  it("submitted_date が未設定なら published_at にフォールバックする", () => {
    expect(
      resolveSubmittedDate({
        submitted_date: null,
        published_at: "2026-09-04T00:00:00+09:00",
      })
    ).toBe("2026-09-04T00:00:00+09:00");
  });

  it("どちらも無ければ null を返す", () => {
    expect(
      resolveSubmittedDate({ submitted_date: null, published_at: null })
    ).toBeNull();
  });

  it("プロパティ自体が無い場合も null を返す", () => {
    expect(resolveSubmittedDate({})).toBeNull();
  });
});

describe("resolveDecidedDate", () => {
  it("decided_date があればそれを返す", () => {
    expect(resolveDecidedDate({ decided_date: "2026-09-10" })).toBe(
      "2026-09-10"
    );
  });

  it("未議決（null）なら null を返し、published_at にはフォールバックしない", () => {
    expect(
      resolveDecidedDate({
        decided_date: null,
        published_at: "2026-09-04T00:00:00+09:00",
      })
    ).toBeNull();
  });
});

describe("submittedDateSortKey", () => {
  it("date 型の submitted_date はその日のキーになる", () => {
    expect(submittedDateSortKey({ submitted_date: "2026-02-12" })).toBe(
      "2026-02-12"
    );
  });

  it("published_at は日本時間の日付にそろえる", () => {
    // 日本時間 0 時 = UTC では前日の 15 時
    expect(
      submittedDateSortKey({ published_at: "2026-02-12T00:00:00+09:00" })
    ).toBe("2026-02-12");
  });

  it("同じ日なら submitted_date と published_at で同じキーになる", () => {
    expect(submittedDateSortKey({ submitted_date: "2026-02-12" })).toBe(
      submittedDateSortKey({ published_at: "2026-02-12T00:00:00+09:00" })
    );
  });

  it("日付が無ければ null", () => {
    expect(submittedDateSortKey({})).toBeNull();
  });
});
