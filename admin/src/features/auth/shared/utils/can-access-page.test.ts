import { describe, expect, it } from "vitest";
import { canAccessPage, getVisibleNavItems } from "./can-access-page";

const BILL_ID = "11111111-1111-1111-1111-111111111111";

describe("canAccessPage", () => {
  describe("運営者", () => {
    it.each([
      "/bills",
      "/bills/new",
      "/bills/merge",
      `/bills/${BILL_ID}/edit`,
      `/bills/${BILL_ID}/contents/edit`,
      `/bills/${BILL_ID}/interview`,
      `/bills/${BILL_ID}/reports`,
      "/council-sessions",
      "/tags",
      "/factions",
      "/committees",
      "/ai-collection",
      "/audit-logs",
      "/admins",
    ])("すべてにアクセスできる: %s", (path) => {
      expect(canAccessPage("admin", path)).toBe(true);
    });
  });

  describe("議員", () => {
    it.each([
      "/bills",
      `/bills/${BILL_ID}`,
      `/bills/${BILL_ID}/edit`,
      `/bills/${BILL_ID}/contents/edit`,
      `/bills/${BILL_ID}/reports`,
      `/bills/${BILL_ID}/reports/session-1`,
      `/bills/${BILL_ID}/topic-analysis`,
    ])("議案の編集と閲覧ができる: %s", (path) => {
      expect(canAccessPage("legislator", path)).toBe(true);
    });

    it.each([
      "/bills/new",
      "/bills/merge",
      `/bills/${BILL_ID}/interview`,
      "/council-sessions",
      "/tags",
      "/factions",
      "/committees",
      "/ai-collection",
      "/audit-logs",
      "/admins",
    ])("マスタ管理と破壊的操作はできない: %s", (path) => {
      expect(canAccessPage("legislator", path)).toBe(false);
    });
  });

  describe("出馬者", () => {
    it.each([
      "/bills",
      `/bills/${BILL_ID}`,
      `/bills/${BILL_ID}/reports`,
      `/bills/${BILL_ID}/reports/session-1`,
      `/bills/${BILL_ID}/topic-analysis`,
    ])("閲覧はできる: %s", (path) => {
      expect(canAccessPage("candidate", path)).toBe(true);
    });

    it.each([
      `/bills/${BILL_ID}/edit`,
      `/bills/${BILL_ID}/contents/edit`,
      "/bills/new",
      "/audit-logs",
      "/admins",
    ])("編集はできない: %s", (path) => {
      expect(canAccessPage("candidate", path)).toBe(false);
    });
  });

  describe("未定義のパス", () => {
    it("運営者のみ許可する（deny by default）", () => {
      expect(canAccessPage("admin", "/unknown-page")).toBe(true);
      expect(canAccessPage("legislator", "/unknown-page")).toBe(false);
      expect(canAccessPage("candidate", "/unknown-page")).toBe(false);
    });

    it("/bills 配下の未定義パスも運営者のみ", () => {
      expect(canAccessPage("legislator", `/bills/${BILL_ID}/unknown`)).toBe(
        false
      );
    });

    it("ルートパスは運営者のみ", () => {
      expect(canAccessPage("legislator", "/")).toBe(false);
    });
  });
});

describe("getVisibleNavItems", () => {
  it("運営者にはすべての項目を出す", () => {
    expect(getVisibleNavItems("admin")).toHaveLength(8);
  });

  it("議員には議案管理のみ", () => {
    const items = getVisibleNavItems("legislator");
    expect(items.map((item) => item.href)).toEqual(["/bills"]);
  });

  it("出馬者にも議案管理のみ", () => {
    const items = getVisibleNavItems("candidate");
    expect(items.map((item) => item.href)).toEqual(["/bills"]);
  });
});
