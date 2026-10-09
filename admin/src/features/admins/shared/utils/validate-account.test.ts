import { describe, expect, it } from "vitest";
import {
  DISPLAY_NAME_MAX_LENGTH,
  normalizeAccountProfile,
  normalizeInviteInput,
} from "./validate-account";

const FACTION_ID = "11111111-1111-1111-1111-111111111111";

describe("normalizeAccountProfile", () => {
  it("議員は所属会派を持つ", () => {
    expect(
      normalizeAccountProfile({
        displayName: " 札幌 太郎 ",
        role: "legislator",
        factionId: FACTION_ID,
      })
    ).toEqual({
      ok: true,
      value: {
        displayName: "札幌 太郎",
        role: "legislator",
        factionId: FACTION_ID,
      },
    });
  });

  it("議員で所属会派が無ければエラー", () => {
    for (const factionId of [null, "", "  "]) {
      expect(
        normalizeAccountProfile({
          displayName: "札幌 太郎",
          role: "legislator",
          factionId,
        })
      ).toEqual({ ok: false, error: "議員は所属会派を選択してください" });
    }
  });

  it.each(["admin", "candidate"])("%s は会派を渡されても持たない", (role) => {
    expect(
      normalizeAccountProfile({
        displayName: "札幌 花子",
        role,
        factionId: FACTION_ID,
      })
    ).toEqual({
      ok: true,
      value: { displayName: "札幌 花子", role, factionId: null },
    });
  });

  it("表示名が空ならエラー", () => {
    expect(
      normalizeAccountProfile({
        displayName: "   ",
        role: "candidate",
        factionId: null,
      })
    ).toEqual({ ok: false, error: "表示名を入力してください" });
  });

  it("表示名は上限の文字数まで受け付ける", () => {
    const displayName = "あ".repeat(DISPLAY_NAME_MAX_LENGTH);
    expect(
      normalizeAccountProfile({ displayName, role: "admin", factionId: null })
    ).toMatchObject({ ok: true });
    expect(
      normalizeAccountProfile({
        displayName: `${displayName}あ`,
        role: "admin",
        factionId: null,
      })
    ).toEqual({
      ok: false,
      error: `表示名は${DISPLAY_NAME_MAX_LENGTH}文字以内で入力してください`,
    });
  });

  it("知らないロールはエラー", () => {
    for (const role of ["", "owner", "Admin"]) {
      expect(
        normalizeAccountProfile({
          displayName: "札幌 太郎",
          role,
          factionId: null,
        })
      ).toEqual({ ok: false, error: "ロールを選択してください" });
    }
  });
});

describe("normalizeInviteInput", () => {
  it("メールアドレスの前後の空白を落として小文字にする", () => {
    expect(
      normalizeInviteInput({
        email: "  Giin@Example.COM ",
        displayName: "札幌 太郎",
        role: "legislator",
        factionId: FACTION_ID,
      })
    ).toEqual({
      ok: true,
      value: {
        email: "giin@example.com",
        displayName: "札幌 太郎",
        role: "legislator",
        factionId: FACTION_ID,
      },
    });
  });

  it("メールアドレスが空ならエラー", () => {
    expect(
      normalizeInviteInput({
        email: " ",
        displayName: "札幌 太郎",
        role: "admin",
        factionId: null,
      })
    ).toEqual({ ok: false, error: "メールアドレスを入力してください" });
  });

  it("メールアドレスの形が正しくなければエラー", () => {
    expect(
      normalizeInviteInput({
        email: "giin@",
        displayName: "札幌 太郎",
        role: "admin",
        factionId: null,
      })
    ).toEqual({ ok: false, error: "有効なメールアドレスを入力してください" });
  });

  it("ロールや表示名のエラーもそのまま返す", () => {
    expect(
      normalizeInviteInput({
        email: "giin@example.com",
        displayName: "札幌 太郎",
        role: "legislator",
        factionId: null,
      })
    ).toEqual({ ok: false, error: "議員は所属会派を選択してください" });
  });
});
