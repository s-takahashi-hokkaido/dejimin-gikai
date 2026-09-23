import { describe, expect, it } from "vitest";
import {
  canEditAdminOnlyBillFields,
  omitAdminOnlyBillFields,
} from "./omit-admin-only-bill-fields";

const input = {
  name: "札幌市税条例の一部を改正する条例案",
  status: "approved",
  published_at: "2026-09-24T00:00:00.000Z",
  is_featured: true,
  thumbnail_url: "https://example.com/a.png",
  share_thumbnail_url: "https://example.com/b.png",
};

describe("canEditAdminOnlyBillFields", () => {
  it("運営者だけが変更できる", () => {
    expect(canEditAdminOnlyBillFields("admin")).toBe(true);
    expect(canEditAdminOnlyBillFields("legislator")).toBe(false);
    expect(canEditAdminOnlyBillFields("candidate")).toBe(false);
  });
});

describe("omitAdminOnlyBillFields", () => {
  it("運営者の更新はそのまま通す", () => {
    expect(omitAdminOnlyBillFields("admin", input)).toEqual(input);
  });

  it("議員の更新からは運営者専用の項目を取り除く", () => {
    expect(omitAdminOnlyBillFields("legislator", input)).toEqual({
      name: input.name,
      status: input.status,
    });
  });

  it("null の値も取り除く（DB の値を null で上書きしない）", () => {
    const result = omitAdminOnlyBillFields("legislator", {
      name: "議案",
      published_at: null,
      thumbnail_url: null,
    });
    expect(result).toEqual({ name: "議案" });
  });

  it("元のオブジェクトを書き換えない", () => {
    const original = { ...input };
    omitAdminOnlyBillFields("legislator", original);
    expect(original).toEqual(input);
  });
});
