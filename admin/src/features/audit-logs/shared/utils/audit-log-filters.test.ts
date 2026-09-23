import { describe, expect, it } from "vitest";
import { buildAuditLogsHref, parseAuditLogFilters } from "./audit-log-filters";

const BILL_ID = "d8b63880-c055-432d-ab0f-740c30088d69";

describe("parseAuditLogFilters", () => {
  it("指定が無ければ絞り込みなしの1ページ目", () => {
    expect(parseAuditLogFilters({})).toEqual({
      table: null,
      billId: null,
      page: 1,
    });
  });

  it("正しい値はそのまま使う", () => {
    expect(
      parseAuditLogFilters({
        table: "bill_contents",
        billId: BILL_ID,
        page: "3",
      })
    ).toEqual({ table: "bill_contents", billId: BILL_ID, page: 3 });
  });

  it("記録対象でないテーブルは無視する", () => {
    expect(parseAuditLogFilters({ table: "bills_tags" }).table).toBeNull();
  });

  it("UUID でない議案IDは無視する（クエリへの混入を防ぐ）", () => {
    expect(
      parseAuditLogFilters({ billId: "x,target_id.is.null" }).billId
    ).toBeNull();
  });

  it.each([
    "0",
    "-1",
    "1.5",
    "abc",
    "",
  ])("ページ番号が不正なら1ページ目: %s", (page) => {
    expect(parseAuditLogFilters({ page }).page).toBe(1);
  });
});

describe("buildAuditLogsHref", () => {
  it("既定値だけならパラメータを付けない", () => {
    expect(buildAuditLogsHref({ table: null, billId: null, page: 1 })).toBe(
      "/audit-logs"
    );
  });

  it("指定した条件をパラメータにする", () => {
    expect(
      buildAuditLogsHref({ table: "bills", billId: BILL_ID, page: 2 })
    ).toBe(`/audit-logs?table=bills&billId=${BILL_ID}&page=2`);
  });

  it("parse と往復できる", () => {
    const filters = {
      table: "faction_stances" as const,
      billId: BILL_ID,
      page: 4,
    };
    const query = new URL(buildAuditLogsHref(filters), "http://localhost")
      .searchParams;

    expect(parseAuditLogFilters(Object.fromEntries(query))).toEqual(filters);
  });
});
