import { describe, expect, it } from "vitest";
import { getAccountStatus } from "./account-status";

describe("getAccountStatus", () => {
  it("メールアドレスが確認済みなら有効", () => {
    expect(getAccountStatus("2026-10-08T00:00:00Z")).toBe("active");
  });

  it("未確認なら招待中", () => {
    expect(getAccountStatus(null)).toBe("invited");
    expect(getAccountStatus(undefined)).toBe("invited");
    expect(getAccountStatus("")).toBe("invited");
  });
});
