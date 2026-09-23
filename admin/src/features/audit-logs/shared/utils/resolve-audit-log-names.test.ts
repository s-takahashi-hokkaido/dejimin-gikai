import { describe, expect, it } from "vitest";
import type { AuditLog } from "../types";
import {
  collectReferencedIds,
  toAuditLogListItems,
} from "./resolve-audit-log-names";

const BILL_ID = "b0000000-0000-0000-0000-000000000001";
const FACTION_ID = "f0000000-0000-0000-0000-000000000001";
const COMMITTEE_ID = "c0000000-0000-0000-0000-000000000001";

function makeLog(overrides: Partial<AuditLog>): AuditLog {
  return {
    id: "a0000000-0000-0000-0000-000000000001",
    actor_user_id: null,
    actor_email: null,
    actor_role: null,
    actor_faction_id: null,
    action: "bills.update",
    target_table: "bills",
    target_id: BILL_ID,
    before_data: null,
    after_data: null,
    bill_id: BILL_ID,
    created_at: "2026-09-23T00:00:00Z",
    ...overrides,
  };
}

const stanceLog = makeLog({
  action: "faction_stances.delete",
  target_table: "faction_stances",
  target_id: "s0000000-0000-0000-0000-000000000001",
  before_data: { bill_id: BILL_ID, faction_id: FACTION_ID, type: "for" },
});

const committeeLog = makeLog({
  action: "bill_committees.insert",
  target_table: "bill_committees",
  target_id: null,
  after_data: { bill_id: BILL_ID, committee_id: COMMITTEE_ID },
});

describe("collectReferencedIds", () => {
  it("議案IDと会派IDを重複なく集める（削除なら変更前から）", () => {
    expect(collectReferencedIds([makeLog({}), stanceLog, stanceLog])).toEqual({
      billIds: [BILL_ID],
      factionIds: [FACTION_ID],
      committeeIds: [],
    });
  });

  it("付託委員会の履歴から委員会IDを集める", () => {
    expect(collectReferencedIds([committeeLog])).toEqual({
      billIds: [BILL_ID],
      factionIds: [],
      committeeIds: [COMMITTEE_ID],
    });
  });
});

describe("toAuditLogListItems", () => {
  it("議案名・会派名を付ける", () => {
    const [item] = toAuditLogListItems(
      [stanceLog],
      new Map([[BILL_ID, "議案A"]]),
      new Map([[FACTION_ID, "会派X"]]),
      new Map()
    );

    expect(item.billName).toBe("議案A");
    expect(item.factionName).toBe("会派X");
  });

  it("削除済みの議案は、議案マスタの履歴に残った議案名を使う", () => {
    const [item] = toAuditLogListItems(
      [
        makeLog({
          action: "bills.delete",
          before_data: { id: BILL_ID, name: "消された議案" },
        }),
      ],
      new Map(),
      new Map(),
      new Map()
    );

    expect(item.billName).toBe("消された議案");
  });

  it("引けなければ null", () => {
    const [item] = toAuditLogListItems(
      [stanceLog],
      new Map(),
      new Map(),
      new Map()
    );

    expect(item.billName).toBeNull();
    expect(item.factionName).toBeNull();
    expect(item.committeeName).toBeNull();
  });

  it("付託委員会の履歴に委員会名を付ける", () => {
    const [item] = toAuditLogListItems(
      [committeeLog],
      new Map([[BILL_ID, "議案A"]]),
      new Map(),
      new Map([[COMMITTEE_ID, "第一部決算特別委員会"]])
    );

    expect(item.billName).toBe("議案A");
    expect(item.committeeName).toBe("第一部決算特別委員会");
  });
});
