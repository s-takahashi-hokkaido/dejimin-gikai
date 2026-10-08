import { describe, expect, it } from "vitest";
import { isEmailLinkType, resolveUpdatePasswordMode } from "./email-link";

const TOKEN_HASH = "0a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5";

describe("isEmailLinkType", () => {
  it("招待と再設定だけを受け付ける", () => {
    expect(isEmailLinkType("invite")).toBe(true);
    expect(isEmailLinkType("recovery")).toBe(true);
    expect(isEmailLinkType("signup")).toBe(false);
    expect(isEmailLinkType("magiclink")).toBe(false);
    expect(isEmailLinkType(undefined)).toBe(false);
    expect(isEmailLinkType(["invite"])).toBe(false);
  });
});

describe("resolveUpdatePasswordMode", () => {
  it("招待のリンクなら invite", () => {
    expect(
      resolveUpdatePasswordMode({
        tokenHash: TOKEN_HASH,
        type: "invite",
        hasSession: false,
      })
    ).toEqual({ kind: "invite", tokenHash: TOKEN_HASH });
  });

  it("再設定のリンクなら recovery", () => {
    expect(
      resolveUpdatePasswordMode({
        tokenHash: TOKEN_HASH,
        type: "recovery",
        hasSession: false,
      })
    ).toEqual({ kind: "recovery", tokenHash: TOKEN_HASH });
  });

  it("PKCE の接頭辞が付いたトークンも受け付ける", () => {
    expect(
      resolveUpdatePasswordMode({
        tokenHash: `pkce_${TOKEN_HASH}`,
        type: "recovery",
        hasSession: false,
      })
    ).toEqual({ kind: "recovery", tokenHash: `pkce_${TOKEN_HASH}` });
  });

  it("ログイン中でもリンクがあればリンクを優先する", () => {
    expect(
      resolveUpdatePasswordMode({
        tokenHash: TOKEN_HASH,
        type: "invite",
        hasSession: true,
      })
    ).toEqual({ kind: "invite", tokenHash: TOKEN_HASH });
  });

  it("リンクが無くログイン中ならパスワード変更", () => {
    expect(
      resolveUpdatePasswordMode({
        tokenHash: undefined,
        type: undefined,
        hasSession: true,
      })
    ).toEqual({ kind: "change" });
  });

  it("リンクが無くログインもしていなければ invalid", () => {
    expect(
      resolveUpdatePasswordMode({
        tokenHash: undefined,
        type: undefined,
        hasSession: false,
      })
    ).toEqual({ kind: "invalid" });
  });

  it("種類が分からないリンクは、ログイン中でも invalid", () => {
    expect(
      resolveUpdatePasswordMode({
        tokenHash: TOKEN_HASH,
        type: "signup",
        hasSession: true,
      })
    ).toEqual({ kind: "invalid" });
    expect(
      resolveUpdatePasswordMode({
        tokenHash: TOKEN_HASH,
        type: undefined,
        hasSession: false,
      })
    ).toEqual({ kind: "invalid" });
  });

  it("トークンの形がおかしければ invalid", () => {
    for (const tokenHash of ["", "abc def", "<script>", "a".repeat(201)]) {
      expect(
        resolveUpdatePasswordMode({
          tokenHash,
          type: "invite",
          hasSession: false,
        })
      ).toEqual({ kind: "invalid" });
    }
  });

  it("同じパラメータが複数あれば invalid", () => {
    expect(
      resolveUpdatePasswordMode({
        tokenHash: [TOKEN_HASH, TOKEN_HASH],
        type: "invite",
        hasSession: false,
      })
    ).toEqual({ kind: "invalid" });
    expect(
      resolveUpdatePasswordMode({
        tokenHash: TOKEN_HASH,
        type: ["invite", "recovery"],
        hasSession: false,
      })
    ).toEqual({ kind: "invalid" });
  });
});
