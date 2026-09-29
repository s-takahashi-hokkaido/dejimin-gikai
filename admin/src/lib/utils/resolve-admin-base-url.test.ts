import { describe, expect, it } from "vitest";
import {
  ADMIN_BASE_URL_FALLBACK,
  resolveAdminBaseUrl,
} from "./resolve-admin-base-url";

describe("resolveAdminBaseUrl", () => {
  it("内部URLが設定されていればそちらを使う", () => {
    expect(
      resolveAdminBaseUrl(
        "http://127.0.0.1:3003",
        "https://gikai-admin.example.com"
      )
    ).toBe("http://127.0.0.1:3003");
  });

  it("内部URLが未設定なら公開URLを使う", () => {
    expect(
      resolveAdminBaseUrl(undefined, "https://gikai-admin.example.com")
    ).toBe("https://gikai-admin.example.com");
  });

  it("内部URLが空文字なら公開URLを使う", () => {
    expect(resolveAdminBaseUrl("", "https://gikai-admin.example.com")).toBe(
      "https://gikai-admin.example.com"
    );
  });

  it("内部URLが空白だけなら公開URLを使う", () => {
    expect(resolveAdminBaseUrl("   ", "https://gikai-admin.example.com")).toBe(
      "https://gikai-admin.example.com"
    );
  });

  it("末尾スラッシュを落とす", () => {
    expect(resolveAdminBaseUrl("http://127.0.0.1:3003/", null)).toBe(
      "http://127.0.0.1:3003"
    );
  });

  it("末尾スラッシュが複数あっても落とす", () => {
    expect(resolveAdminBaseUrl("http://127.0.0.1:3003///", null)).toBe(
      "http://127.0.0.1:3003"
    );
  });

  it("公開URLの末尾スラッシュも落とす", () => {
    expect(
      resolveAdminBaseUrl(undefined, "https://gikai-admin.example.com/")
    ).toBe("https://gikai-admin.example.com");
  });

  it("前後の空白を取り除く", () => {
    expect(resolveAdminBaseUrl("  http://127.0.0.1:3003  ", null)).toBe(
      "http://127.0.0.1:3003"
    );
  });

  it("スキームの無い内部URLは不正として公開URLにフォールバックする", () => {
    expect(
      resolveAdminBaseUrl("127.0.0.1:3003", "https://gikai-admin.example.com")
    ).toBe("https://gikai-admin.example.com");
  });

  it("スキームと誤認されるホスト:ポート指定も不正として扱う", () => {
    expect(
      resolveAdminBaseUrl("localhost:3003", "https://gikai-admin.example.com")
    ).toBe("https://gikai-admin.example.com");
  });

  it("http / https 以外のスキームは不正として公開URLにフォールバックする", () => {
    expect(
      resolveAdminBaseUrl(
        "ftp://127.0.0.1:3003",
        "https://gikai-admin.example.com"
      )
    ).toBe("https://gikai-admin.example.com");
  });

  it("URLとして解釈できない内部URLは公開URLにフォールバックする", () => {
    expect(
      resolveAdminBaseUrl("http://", "https://gikai-admin.example.com")
    ).toBe("https://gikai-admin.example.com");
  });

  it("両方とも使えなければ既定値を返す", () => {
    expect(resolveAdminBaseUrl(undefined, undefined)).toBe(
      ADMIN_BASE_URL_FALLBACK
    );
    expect(resolveAdminBaseUrl("", "")).toBe(ADMIN_BASE_URL_FALLBACK);
    expect(resolveAdminBaseUrl("127.0.0.1:3003", "not-a-url")).toBe(
      ADMIN_BASE_URL_FALLBACK
    );
  });

  it("サブパス付きの公開URLでもパスを保つ", () => {
    expect(resolveAdminBaseUrl(undefined, "https://example.com/admin/")).toBe(
      "https://example.com/admin"
    );
  });
});
