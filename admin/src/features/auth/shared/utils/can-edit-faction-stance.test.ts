import { describe, expect, it } from "vitest";
import { canEditFactionStance } from "./can-edit-faction-stance";

const OWN_FACTION = "11111111-1111-1111-1111-111111111111";
const OTHER_FACTION = "22222222-2222-2222-2222-222222222222";

describe("canEditFactionStance", () => {
  it("運営者はどの会派の見解も編集できる", () => {
    const admin = { role: "admin", factionId: null } as const;
    expect(canEditFactionStance(admin, OWN_FACTION)).toBe(true);
    expect(canEditFactionStance(admin, OTHER_FACTION)).toBe(true);
  });

  it("議員は自会派の見解を編集できる", () => {
    const legislator = { role: "legislator", factionId: OWN_FACTION } as const;
    expect(canEditFactionStance(legislator, OWN_FACTION)).toBe(true);
  });

  it("議員は他会派の見解を編集できない", () => {
    const legislator = { role: "legislator", factionId: OWN_FACTION } as const;
    expect(canEditFactionStance(legislator, OTHER_FACTION)).toBe(false);
  });

  it("会派を持たない議員はどの会派の見解も編集できない", () => {
    const legislator = { role: "legislator", factionId: null } as const;
    expect(canEditFactionStance(legislator, OWN_FACTION)).toBe(false);
  });

  it("出馬者は編集できない", () => {
    const candidate = { role: "candidate", factionId: OWN_FACTION } as const;
    expect(canEditFactionStance(candidate, OWN_FACTION)).toBe(false);
  });
});
