import { describe, expect, it } from "vitest";
import {
  describeSeedTarget,
  maskSecret,
  resolveSeedTarget,
} from "./resolve-seed-target";

const env = {
  SUPABASE_URL: "http://127.0.0.1:54121",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key-0123456789",
};

describe("maskSecret", () => {
  it("先頭と末尾だけ残す", () => {
    expect(maskSecret("abcdefghijklmnop")).toBe("abcd...mnop (16 文字)");
  });

  it("短い文字列は全部伏せる", () => {
    expect(maskSecret("short")).toBe("********");
  });

  it("空文字も全部伏せる", () => {
    expect(maskSecret("")).toBe("********");
  });
});

describe("resolveSeedTarget", () => {
  describe("モードの決定", () => {
    it("引数が無ければ dry-run（既定で書き込まない）", () => {
      expect(resolveSeedTarget({ env, argv: [] }).mode).toBe("dry-run");
    });

    it("--yes を付けたときだけ apply になる", () => {
      expect(resolveSeedTarget({ env, argv: ["--yes"] }).mode).toBe("apply");
    });

    it("--dry-run を明示しても dry-run", () => {
      expect(resolveSeedTarget({ env, argv: ["--dry-run"] }).mode).toBe(
        "dry-run",
      );
    });

    it("--yes と --dry-run を同時に指定したら例外", () => {
      expect(() =>
        resolveSeedTarget({ env, argv: ["--yes", "--dry-run"] }),
      ).toThrow("--yes と --dry-run は同時に指定できません");
    });

    it("不明なオプションは例外（--yes の打ち間違いを黙って流さない）", () => {
      expect(() => resolveSeedTarget({ env, argv: ["--yes=true"] })).toThrow(
        "不明なオプションです: --yes=true",
      );
    });
  });

  describe("接続先の解決", () => {
    it("URL とキーとホストを返す", () => {
      const target = resolveSeedTarget({ env, argv: [] });
      expect(target.supabaseUrl).toBe("http://127.0.0.1:54121");
      expect(target.serviceRoleKey).toBe("service-role-key-0123456789");
      expect(target.host).toBe("127.0.0.1:54121");
    });

    it("ドメインのホストも取れる", () => {
      const target = resolveSeedTarget({
        env: { ...env, SUPABASE_URL: "https://db.ezocivic.tech" },
        argv: ["--yes"],
      });
      expect(target.host).toBe("db.ezocivic.tech");
    });

    it("前後の空白は落とす", () => {
      const target = resolveSeedTarget({
        env: {
          SUPABASE_URL: "  http://127.0.0.1:8000  ",
          SUPABASE_SERVICE_ROLE_KEY: "  key-0123456789  ",
        },
        argv: [],
      });
      expect(target.supabaseUrl).toBe("http://127.0.0.1:8000");
      expect(target.serviceRoleKey).toBe("key-0123456789");
    });
  });

  describe("環境変数が足りない場合", () => {
    it("SUPABASE_URL が無ければ例外", () => {
      expect(() =>
        resolveSeedTarget({
          env: { SUPABASE_SERVICE_ROLE_KEY: "key-0123456789" },
          argv: [],
        }),
      ).toThrow("SUPABASE_URL が設定されていません");
    });

    it("SUPABASE_URL が空文字でも例外", () => {
      expect(() =>
        resolveSeedTarget({
          env: { ...env, SUPABASE_URL: "   " },
          argv: [],
        }),
      ).toThrow("SUPABASE_URL が設定されていません");
    });

    it("SUPABASE_SERVICE_ROLE_KEY が無ければ例外", () => {
      expect(() =>
        resolveSeedTarget({
          env: { SUPABASE_URL: "http://127.0.0.1:54121" },
          argv: [],
        }),
      ).toThrow("SUPABASE_SERVICE_ROLE_KEY が設定されていません");
    });

    it("URL として解釈できなければ例外", () => {
      expect(() =>
        resolveSeedTarget({
          env: { ...env, SUPABASE_URL: "127.0.0.1:54121" },
          argv: [],
        }),
      ).toThrow("SUPABASE_URL が URL として解釈できません");
    });
  });
});

describe("describeSeedTarget", () => {
  it("接続先とモードを出し、キーは伏せる", () => {
    const text = describeSeedTarget(resolveSeedTarget({ env, argv: ["--yes"] }));
    expect(text).toContain("http://127.0.0.1:54121");
    expect(text).toContain("127.0.0.1:54121");
    expect(text).toContain("apply（DB に書き込みます）");
    expect(text).not.toContain("service-role-key-0123456789");
  });

  it("dry-run では書き込まないと明示する", () => {
    const text = describeSeedTarget(resolveSeedTarget({ env, argv: [] }));
    expect(text).toContain("dry-run（DB には書き込みません）");
  });
});
