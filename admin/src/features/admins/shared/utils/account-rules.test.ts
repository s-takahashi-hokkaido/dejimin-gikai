import { describe, expect, it } from "vitest";
import {
  validateAccountDeletion,
  validateAccountUpdate,
  validateInvitationResend,
} from "./account-rules";

const ME = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";
const FACTION_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const FACTION_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

describe("validateAccountUpdate", () => {
  it("他人のロールは変えられる", () => {
    expect(
      validateAccountUpdate({
        actorId: ME,
        current: { id: OTHER, role: "candidate", factionId: null },
        next: { role: "legislator", factionId: FACTION_A },
      })
    ).toBeNull();
  });

  it("他人の所属会派は変えられる", () => {
    expect(
      validateAccountUpdate({
        actorId: ME,
        current: { id: OTHER, role: "legislator", factionId: FACTION_A },
        next: { role: "legislator", factionId: FACTION_B },
      })
    ).toBeNull();
  });

  it("自分のロールは変えられない", () => {
    expect(
      validateAccountUpdate({
        actorId: ME,
        current: { id: ME, role: "admin", factionId: null },
        next: { role: "legislator", factionId: FACTION_A },
      })
    ).toBe(
      "自分のロール・所属会派は変更できません。別の運営者に依頼してください"
    );
  });

  it("ロールと会派がそのままなら自分でも通す（表示名だけの変更）", () => {
    expect(
      validateAccountUpdate({
        actorId: ME,
        current: { id: ME, role: "admin", factionId: null },
        next: { role: "admin", factionId: null },
      })
    ).toBeNull();
  });
});

describe("validateAccountDeletion", () => {
  it("他人は削除できる", () => {
    expect(validateAccountDeletion(ME, OTHER)).toBeNull();
  });

  it("自分自身は削除できない", () => {
    expect(validateAccountDeletion(ME, ME)).toBe(
      "自分自身を削除することはできません"
    );
  });
});

describe("validateInvitationResend", () => {
  it("招待中なら送り直せる", () => {
    expect(validateInvitationResend("invited")).toBeNull();
  });

  it("パスワード設定済みなら送り直せない", () => {
    expect(validateInvitationResend("active")).toContain(
      "パスワードを設定済みです"
    );
  });
});
