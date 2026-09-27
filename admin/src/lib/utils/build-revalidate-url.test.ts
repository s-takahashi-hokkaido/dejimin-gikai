import { describe, expect, it } from "vitest";
import { buildRevalidateUrl } from "./build-revalidate-url";

describe("buildRevalidateUrl", () => {
  it("内部URLが設定されていればそちらに送る", () => {
    expect(
      buildRevalidateUrl("http://127.0.0.1:3004", "https://gikai.example.com")
    ).toBe("http://127.0.0.1:3004/api/revalidate");
  });

  it("内部URLが未設定なら公開URLに送る", () => {
    expect(buildRevalidateUrl(undefined, "https://gikai.example.com")).toBe(
      "https://gikai.example.com/api/revalidate"
    );
  });

  it("内部URLが空文字なら公開URLに送る", () => {
    expect(buildRevalidateUrl("", "http://localhost:3000")).toBe(
      "http://localhost:3000/api/revalidate"
    );
  });

  it("内部URLが空白だけなら公開URLに送る", () => {
    expect(buildRevalidateUrl("   ", "http://localhost:3000")).toBe(
      "http://localhost:3000/api/revalidate"
    );
  });

  it("内部URLの末尾スラッシュを落としてパスを繋ぐ", () => {
    expect(buildRevalidateUrl("http://127.0.0.1:3004/", null)).toBe(
      "http://127.0.0.1:3004/api/revalidate"
    );
  });

  it("末尾スラッシュが複数あっても1つ分のパスになる", () => {
    expect(buildRevalidateUrl("http://127.0.0.1:3004///", null)).toBe(
      "http://127.0.0.1:3004/api/revalidate"
    );
  });

  it("公開URLの末尾スラッシュも落とす", () => {
    expect(buildRevalidateUrl(undefined, "https://gikai.example.com/")).toBe(
      "https://gikai.example.com/api/revalidate"
    );
  });

  it("前後の空白を取り除く", () => {
    expect(buildRevalidateUrl("  http://127.0.0.1:3004  ", null)).toBe(
      "http://127.0.0.1:3004/api/revalidate"
    );
  });

  it("スキームの無い内部URLは不正として公開URLにフォールバックする", () => {
    expect(
      buildRevalidateUrl("127.0.0.1:3004", "https://gikai.example.com")
    ).toBe("https://gikai.example.com/api/revalidate");
  });

  it("http / https 以外のスキームは不正として公開URLにフォールバックする", () => {
    expect(
      buildRevalidateUrl("ftp://127.0.0.1:3004", "https://gikai.example.com")
    ).toBe("https://gikai.example.com/api/revalidate");
  });

  it("スキームと誤認されるホスト:ポート指定も不正として扱う", () => {
    expect(
      buildRevalidateUrl("localhost:3004", "https://gikai.example.com")
    ).toBe("https://gikai.example.com/api/revalidate");
  });

  it("URLとして解釈できない内部URLは公開URLにフォールバックする", () => {
    expect(buildRevalidateUrl("http://", "https://gikai.example.com")).toBe(
      "https://gikai.example.com/api/revalidate"
    );
  });

  it("両方とも使えない値なら null を返す", () => {
    expect(buildRevalidateUrl(undefined, undefined)).toBeNull();
    expect(buildRevalidateUrl("", "")).toBeNull();
    expect(buildRevalidateUrl("127.0.0.1:3004", "not-a-url")).toBeNull();
  });

  it("サブパス付きの公開URLでもパスを保つ", () => {
    expect(buildRevalidateUrl(undefined, "https://example.com/gikai/")).toBe(
      "https://example.com/gikai/api/revalidate"
    );
  });
});
