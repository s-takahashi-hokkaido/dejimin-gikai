import { describe, expect, it } from "vitest";
import { buildUpdatePasswordUrl, isPublicAuthPath } from "./auth-paths";

describe("isPublicAuthPath", () => {
  it.each([
    "/login",
    "/reset-password",
    "/update-password",
  ])("%s はログイン無しで通す", (path) => {
    expect(isPublicAuthPath(path)).toBe(true);
  });

  it.each([
    "/",
    "/bills",
    "/admins",
    "/login/extra",
    "/update-password/x",
    "/reset-passwords",
  ])("%s はログインを求める", (path) => {
    expect(isPublicAuthPath(path)).toBe(false);
  });
});

describe("buildUpdatePasswordUrl", () => {
  it("公開 URL に /update-password を付ける", () => {
    expect(buildUpdatePasswordUrl("https://gikai-admin.ezocivic.tech")).toBe(
      "https://gikai-admin.ezocivic.tech/update-password"
    );
  });

  it("末尾のスラッシュを重ねない", () => {
    expect(buildUpdatePasswordUrl("http://localhost:3003/")).toBe(
      "http://localhost:3003/update-password"
    );
  });

  it("未設定・空文字なら null", () => {
    expect(buildUpdatePasswordUrl(undefined)).toBeNull();
    expect(buildUpdatePasswordUrl(null)).toBeNull();
    expect(buildUpdatePasswordUrl("")).toBeNull();
  });

  it("http / https 以外や URL でない値は null", () => {
    expect(buildUpdatePasswordUrl("gikai-admin.ezocivic.tech")).toBeNull();
    expect(buildUpdatePasswordUrl("javascript:alert(1)")).toBeNull();
  });
});
