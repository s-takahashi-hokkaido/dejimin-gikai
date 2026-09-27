import { describe, expect, it } from "vitest";
import {
  describeSeedTarget,
  maskSecret,
  resolveSeedTarget,
  type SeedTarget,
} from "./resolve-seed-target";

const env = {
  SUPABASE_URL: "http://127.0.0.1:54121",
  SUPABASE_SERVICE_ROLE_KEY: "eyJhbGciOiJIUzI1NiJ9.service-role.0123456789",
};

/** help 以外であることを前提に接続情報を取り出す */
function connected(target: SeedTarget) {
  if (target.mode === "help") throw new Error("help が返りました");
  return target;
}

describe("maskSecret", () => {
  it("末尾と長さだけを出す（JWT の先頭は全員 eyJh なので出さない）", () => {
    expect(maskSecret("eyJhbGciOiJIUzI1NiJ9")).toBe("...NiJ9（20 文字）");
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

    it("pnpm が付ける `--` は素通りさせる", () => {
      expect(resolveSeedTarget({ env, argv: ["--", "--yes"] }).mode).toBe(
        "apply",
      );
    });

    it("--help / -h は help モード（環境変数が無くても落ちない）", () => {
      expect(resolveSeedTarget({ env: {}, argv: ["--help"] })).toEqual({
        mode: "help",
      });
      expect(resolveSeedTarget({ env: {}, argv: ["-h"] })).toEqual({
        mode: "help",
      });
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
      const target = connected(resolveSeedTarget({ env, argv: [] }));
      expect(target.supabaseUrl).toBe("http://127.0.0.1:54121");
      expect(target.serviceRoleKey).toBe(env.SUPABASE_SERVICE_ROLE_KEY);
      expect(target.host).toBe("127.0.0.1:54121");
    });

    it("https のドメインのホストも取れる", () => {
      const target = connected(
        resolveSeedTarget({
          env: { ...env, SUPABASE_URL: "https://db.ezocivic.tech" },
          argv: ["--yes"],
        }),
      );
      expect(target.host).toBe("db.ezocivic.tech");
    });

    it("前後の空白は落とす", () => {
      const target = connected(
        resolveSeedTarget({
          env: {
            SUPABASE_URL: "  http://127.0.0.1:8000  ",
            SUPABASE_SERVICE_ROLE_KEY: "  key-0123456789  ",
          },
          argv: [],
        }),
      );
      expect(target.supabaseUrl).toBe("http://127.0.0.1:8000");
      expect(target.serviceRoleKey).toBe("key-0123456789");
    });
  });

  describe("環境変数が足りない・間違っている場合", () => {
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
        resolveSeedTarget({ env: { ...env, SUPABASE_URL: "   " }, argv: [] }),
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

    it("スキームを書き忘れた `localhost:8000` は例外（new URL は通してしまうため）", () => {
      expect(() =>
        resolveSeedTarget({
          env: { ...env, SUPABASE_URL: "localhost:8000" },
          argv: [],
        }),
      ).toThrow("http:// か https:// で始めてください");
    });

    it("PROD_DB_URL を貼り間違えたら例外", () => {
      expect(() =>
        resolveSeedTarget({
          env: {
            ...env,
            SUPABASE_URL:
              "postgresql://postgres:pw@127.0.0.1:5433/postgres?sslmode=disable",
          },
          argv: [],
        }),
      ).toThrow("http:// か https:// で始めてください");
    });

    it("ホスト名が無ければ例外", () => {
      expect(() =>
        resolveSeedTarget({
          env: { ...env, SUPABASE_URL: "http://" },
          argv: [],
        }),
      ).toThrow("SUPABASE_URL が URL として解釈できません");
    });
  });
});

describe("describeSeedTarget", () => {
  it("接続先とモードを出し、キーは伏せる", () => {
    const text = describeSeedTarget(
      connected(resolveSeedTarget({ env, argv: ["--yes"] })),
    );
    expect(text).toContain("http://127.0.0.1:54121");
    expect(text).toContain("127.0.0.1:54121");
    expect(text).toContain("apply（DB に書き込みます）");
    expect(text).not.toContain(env.SUPABASE_SERVICE_ROLE_KEY);
    expect(text).not.toContain("eyJh");
  });

  it("dry-run では書き込まないと明示する", () => {
    const text = describeSeedTarget(
      connected(resolveSeedTarget({ env, argv: [] })),
    );
    expect(text).toContain("dry-run（DB には書き込みません）");
  });
});
