import { describe, expect, it } from "vitest";
import { type AdminAccountRow, toAdminAccount } from "./to-admin-account";

function buildRow(overrides: Partial<Record<keyof AdminAccountRow, unknown>>) {
  return {
    user_id: "11111111-1111-1111-1111-111111111111",
    email: "giin@example.com",
    display_name: "札幌 太郎",
    role: "legislator",
    faction_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    faction_name: "テスト会派",
    invited_at: "2026-10-01T00:00:00Z",
    email_confirmed_at: "2026-10-02T00:00:00Z",
    last_sign_in_at: "2026-10-03T00:00:00Z",
    created_at: "2026-10-01T00:00:00Z",
    ...overrides,
  } as AdminAccountRow;
}

describe("toAdminAccount", () => {
  it("DB 関数の行を一覧の形にする", () => {
    expect(toAdminAccount(buildRow({}))).toEqual({
      id: "11111111-1111-1111-1111-111111111111",
      email: "giin@example.com",
      displayName: "札幌 太郎",
      role: "legislator",
      factionId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      factionName: "テスト会派",
      status: "active",
      invitedAt: "2026-10-01T00:00:00Z",
      createdAt: "2026-10-01T00:00:00Z",
      lastSignInAt: "2026-10-03T00:00:00Z",
    });
  });

  it("メールアドレスが未確認なら招待中", () => {
    expect(
      toAdminAccount(
        buildRow({ email_confirmed_at: null, last_sign_in_at: null })
      )
    ).toMatchObject({ status: "invited", lastSignInAt: null });
  });

  it("会派・招待日時が無ければ null にする", () => {
    expect(
      toAdminAccount(
        buildRow({
          role: "admin",
          faction_id: null,
          faction_name: null,
          invited_at: null,
        })
      )
    ).toMatchObject({
      role: "admin",
      factionId: null,
      factionName: null,
      invitedAt: null,
    });
  });

  it("知らないロールの行は null を返す", () => {
    expect(toAdminAccount(buildRow({ role: "owner" }))).toBeNull();
  });
});
