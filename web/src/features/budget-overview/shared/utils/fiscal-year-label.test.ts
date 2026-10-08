import { describe, expect, it } from "vitest";
import { getFiscalYearLabel } from "./fiscal-year-label";

describe("getFiscalYearLabel", () => {
  it("会期名の令和の年を年度にする", () => {
    expect(getFiscalYearLabel("令和8年第1回定例会")).toBe("令和8年度");
  });

  it("2 桁の年も取り出す", () => {
    expect(getFiscalYearLabel("令和10年第1回定例会")).toBe("令和10年度");
  });

  it("令和の年が無いときは null", () => {
    expect(getFiscalYearLabel("第1回定例会")).toBeNull();
  });
});
