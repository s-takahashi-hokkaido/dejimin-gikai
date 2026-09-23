import { describe, expect, it } from "vitest";
import {
  AUDIT_ACTOR_HEADER,
  buildAuditActorHeaders,
  encodeAuditActor,
} from "./audit-actor";

function decode(value: string) {
  return JSON.parse(Buffer.from(value, "base64").toString("utf8"));
}

describe("encodeAuditActor", () => {
  it("実行者を base64(JSON) にする", () => {
    const encoded = encodeAuditActor({
      id: "11111111-1111-1111-1111-111111111111",
      email: "admin@example.com",
      role: "legislator",
      factionId: "22222222-2222-2222-2222-222222222222",
    });

    expect(decode(encoded)).toEqual({
      id: "11111111-1111-1111-1111-111111111111",
      email: "admin@example.com",
      role: "legislator",
      factionId: "22222222-2222-2222-2222-222222222222",
    });
  });

  it("ヘッダに載せられるよう ASCII だけで表す（日本語のメールアドレスでも）", () => {
    const encoded = encodeAuditActor({
      id: "11111111-1111-1111-1111-111111111111",
      email: "議員@example.jp",
      role: "legislator",
      factionId: null,
    });

    expect(encoded).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(decode(encoded).email).toBe("議員@example.jp");
  });

  it("実行者以外のプロパティは載せない", () => {
    const user = {
      id: "11111111-1111-1111-1111-111111111111",
      email: "admin@example.com",
      role: "admin",
      factionId: null,
      displayName: "運営者",
    };

    expect(decode(encodeAuditActor(user))).toEqual({
      id: "11111111-1111-1111-1111-111111111111",
      email: "admin@example.com",
      role: "admin",
      factionId: null,
    });
  });
});

describe("buildAuditActorHeaders", () => {
  it("x-audit-actor ヘッダに載せる", () => {
    const headers = buildAuditActorHeaders({
      id: "11111111-1111-1111-1111-111111111111",
      email: "admin@example.com",
      role: "admin",
      factionId: null,
    });

    expect(Object.keys(headers)).toEqual([AUDIT_ACTOR_HEADER]);
    expect(decode(headers[AUDIT_ACTOR_HEADER]).role).toBe("admin");
  });
});
