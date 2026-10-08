import { describe, expect, it } from "vitest";
import type { CouncilSession } from "../types";
import {
  formatSessionDescription,
  formatSessionPeriod,
  getSessionStartYear,
  groupSessionsByYear,
} from "./group-sessions-by-year";

const makeSession = (
  overrides: Partial<CouncilSession> & { start_date: string }
): CouncilSession => ({
  id: "id-1",
  name: "第1回定例会",
  slug: "session-1",
  council_url: null,
  end_date: null,
  is_active: false,
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
  ...overrides,
});

describe("groupSessionsByYear", () => {
  it("年別にグループ化し新しい順に返す", () => {
    const sessions: CouncilSession[] = [
      makeSession({ id: "1", start_date: "2025-09-01" }),
      makeSession({ id: "2", start_date: "2026-02-01" }),
      makeSession({ id: "3", start_date: "2025-12-01" }),
    ];

    const result = groupSessionsByYear(sessions);

    expect(result).toHaveLength(2);
    expect(result[0].year).toBe(2026);
    expect(result[1].year).toBe(2025);
    expect(result[1].sessions).toHaveLength(2);
  });

  it("空配列のとき空を返す", () => {
    expect(groupSessionsByYear([])).toEqual([]);
  });
});

describe("formatSessionPeriod", () => {
  it("開始・終了が異なる月の場合 'YYYY.M〜M' を返す", () => {
    const session = makeSession({
      start_date: "2026-02-01",
      end_date: "2026-03-31",
    });
    expect(formatSessionPeriod(session)).toBe("2026.2〜3");
  });

  it("開始・終了が同じ月の場合 'YYYY.M' を返す", () => {
    const session = makeSession({
      start_date: "2025-12-01",
      end_date: "2025-12-20",
    });
    expect(formatSessionPeriod(session)).toBe("2025.12");
  });

  it("end_dateがない場合 'YYYY.M' を返す", () => {
    const session = makeSession({ start_date: "2025-09-01", end_date: null });
    expect(formatSessionPeriod(session)).toBe("2025.9");
  });
});

describe("getSessionStartYear", () => {
  it("start_date の年を返す", () => {
    expect(getSessionStartYear(makeSession({ start_date: "2026-02-15" }))).toBe(
      2026
    );
  });
});

describe("formatSessionDescription", () => {
  it("開始月〜終了月と会期名をつなぐ", () => {
    const session = makeSession({
      start_date: "2026-02-15",
      end_date: "2026-03-25",
    });
    expect(formatSessionDescription(session)).toBe(
      "2026.2月〜3月に実施された第1回定例会"
    );
  });

  it("end_date がないときは開始月を終了月にする", () => {
    const session = makeSession({ start_date: "2026-05-20" });
    expect(formatSessionDescription(session)).toBe(
      "2026.5月〜5月に実施された第1回定例会"
    );
  });
});
