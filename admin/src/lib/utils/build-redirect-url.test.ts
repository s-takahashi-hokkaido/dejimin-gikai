import { describe, expect, it } from "vitest";
import { buildRedirectUrl } from "./build-redirect-url";

// standalone の server.js が middleware に渡す URL（HOSTNAME:PORT 由来）
const STANDALONE_URL = "https://localhost:3003/bills";

describe("buildRedirectUrl", () => {
  it("nginx の裏では Host ヘッダーと X-Forwarded-Proto のオリジンを使う", () => {
    expect(
      buildRedirectUrl("/login", {
        host: "gikai-admin.ezocivic.tech",
        forwardedProto: "https",
        fallbackUrl: STANDALONE_URL,
      })
    ).toBe("https://gikai-admin.ezocivic.tech/login");
  });

  it("X-Forwarded-Proto が http ならそのまま http にする", () => {
    expect(
      buildRedirectUrl("/login", {
        host: "gikai-admin.ezocivic.tech",
        forwardedProto: "http",
        fallbackUrl: STANDALONE_URL,
      })
    ).toBe("http://gikai-admin.ezocivic.tech/login");
  });

  it("X-Forwarded-Proto が連なっている時は先頭を使う", () => {
    expect(
      buildRedirectUrl("/login", {
        host: "gikai-admin.ezocivic.tech",
        forwardedProto: " HTTPS , http",
        fallbackUrl: "http://localhost:3003/",
      })
    ).toBe("https://gikai-admin.ezocivic.tech/login");
  });

  it("X-Forwarded-Proto が無ければ fallbackUrl のプロトコルを使う", () => {
    expect(
      buildRedirectUrl("/login", {
        host: "localhost:3001",
        forwardedProto: null,
        fallbackUrl: "http://localhost:3001/bills",
      })
    ).toBe("http://localhost:3001/login");
  });

  it("X-Forwarded-Proto が http/https 以外なら fallbackUrl のプロトコルを使う", () => {
    expect(
      buildRedirectUrl("/login", {
        host: "gikai-admin.ezocivic.tech",
        forwardedProto: "javascript",
        fallbackUrl: STANDALONE_URL,
      })
    ).toBe("https://gikai-admin.ezocivic.tech/login");
  });

  it("IPv6 アドレスの Host も扱える", () => {
    expect(
      buildRedirectUrl("/login", {
        host: "[::1]:3001",
        forwardedProto: null,
        fallbackUrl: "http://localhost:3001/",
      })
    ).toBe("http://[::1]:3001/login");
  });

  it("クエリ付きのパスも組み立てられる", () => {
    expect(
      buildRedirectUrl("/login?error=unauthorized", {
        host: "gikai-admin.ezocivic.tech",
        forwardedProto: "https",
        fallbackUrl: STANDALONE_URL,
      })
    ).toBe("https://gikai-admin.ezocivic.tech/login?error=unauthorized");
  });

  it("Host ヘッダーが無ければ fallbackUrl のオリジンを使う", () => {
    expect(
      buildRedirectUrl("/login", {
        host: null,
        forwardedProto: "https",
        fallbackUrl: STANDALONE_URL,
      })
    ).toBe("https://localhost:3003/login");
  });

  it("Host ヘッダーが空白だけなら fallbackUrl のオリジンを使う", () => {
    expect(
      buildRedirectUrl("/login", {
        host: "   ",
        forwardedProto: "https",
        fallbackUrl: STANDALONE_URL,
      })
    ).toBe("https://localhost:3003/login");
  });

  it.each([
    "evil.example.com/path",
    "user@evil.example.com",
    "evil.example.com\\",
    "evil.example.com:port",
    "example.com:99999",
    "[1:2]",
  ])("不正な Host ヘッダー（%s）は使わない", (host) => {
    expect(
      buildRedirectUrl("/login", {
        host,
        forwardedProto: "https",
        fallbackUrl: STANDALONE_URL,
      })
    ).toBe("https://localhost:3003/login");
  });
});
