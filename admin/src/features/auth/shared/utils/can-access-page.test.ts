import { describe, expect, it } from "vitest";
import { canAccessPage, getVisibleNavItems } from "./can-access-page";

const BILL_ID = "11111111-1111-1111-1111-111111111111";
const TOPIC_ID = "22222222-2222-2222-2222-222222222222";

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
      "/prompts",
      "/prompts/some-id",
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
      "/prompts",
      "/prompts/some-id",
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
      `/bills/${BILL_ID}/topic-analysis/version-1`,
    ])("議案一覧とインタビュー結果は閲覧できる: %s", (path) => {
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

  describe("AIインタビュー広場の議題", () => {
    it.each([
      "legislator",
      "candidate",
    ] as const)("%s は一覧・作成・詳細・編集・インタビュー設定を開ける", (role) => {
      expect(canAccessPage(role, "/plaza-topics")).toBe(true);
      expect(canAccessPage(role, "/plaza-topics/new")).toBe(true);
      expect(canAccessPage(role, `/plaza-topics/${TOPIC_ID}`)).toBe(true);
      expect(canAccessPage(role, `/plaza-topics/${TOPIC_ID}/edit`)).toBe(true);
      expect(canAccessPage(role, `/plaza-topics/${TOPIC_ID}/interview`)).toBe(
        true
      );
    });

    it("運営者は一覧と詳細だけ開ける（議題は出せない。K3）", () => {
      expect(canAccessPage("admin", "/plaza-topics")).toBe(true);
      expect(canAccessPage("admin", `/plaza-topics/${TOPIC_ID}`)).toBe(true);
      expect(canAccessPage("admin", "/plaza-topics/new")).toBe(false);
      expect(canAccessPage("admin", `/plaza-topics/${TOPIC_ID}/edit`)).toBe(
        false
      );
      expect(
        canAccessPage("admin", `/plaza-topics/${TOPIC_ID}/interview`)
      ).toBe(false);
    });

    it("未定義の配下のパスは運営者のみ（deny by default）", () => {
      const path = `/plaza-topics/${TOPIC_ID}/unknown`;
      expect(canAccessPage("admin", path)).toBe(true);
      expect(canAccessPage("legislator", path)).toBe(false);
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
  const PLAZA_ON = { plaza: true } as const;
  const PLAZA_OFF = { plaza: false } as const;

  it("運営者にはすべての項目を出す", () => {
    expect(getVisibleNavItems("admin", PLAZA_ON)).toHaveLength(10);
  });

  it("議員には議案管理と広場", () => {
    const items = getVisibleNavItems("legislator", PLAZA_ON);
    expect(items.map((item) => item.href)).toEqual(["/bills", "/plaza-topics"]);
  });

  it("出馬者にも議案管理と広場", () => {
    const items = getVisibleNavItems("candidate", PLAZA_ON);
    expect(items.map((item) => item.href)).toEqual(["/bills", "/plaza-topics"]);
  });

  describe("広場の機能フラグがオフ", () => {
    it.each([
      "admin",
      "legislator",
      "candidate",
    ] as const)("%s にも広場を出さない", (role) => {
      const hrefs = getVisibleNavItems(role, PLAZA_OFF).map(
        (item) => item.href
      );
      expect(hrefs).not.toContain("/plaza-topics");
    });

    it("フラグを渡さなければオフとして扱う", () => {
      const hrefs = getVisibleNavItems("legislator").map((item) => item.href);
      expect(hrefs).toEqual(["/bills"]);
    });
  });
});
