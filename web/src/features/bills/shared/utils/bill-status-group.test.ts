import { describe, expect, it } from "vitest";
import type { BillStatusEnum } from "../types";
import { getCardStatusLabel } from "./bill-status";
import {
  countByStatusGroup,
  filterByStatusGroup,
  isBillStatusGroup,
  toBillStatusGroup,
} from "./bill-status-group";

const bill = (status: BillStatusEnum) => ({ status });

describe("toBillStatusGroup", () => {
  it("委員会・本会議の審議中を「審議中」に畳む", () => {
    expect(toBillStatusGroup("in_committee")).toBe("deliberating");
    expect(toBillStatusGroup("plenary_session")).toBe("deliberating");
  });

  // 既存の getCardStatusLabel が submitted を「議会審議中」に含めるため、
  // ここで別のグループに落とすとバッジとタブが食い違う。
  it("上程済みは既存バッジに合わせて「審議中」に含める", () => {
    expect(toBillStatusGroup("submitted")).toBe("deliberating");
  });

  it("可決・採択・趣旨採択は「可決・採択」に入れる", () => {
    expect(toBillStatusGroup("approved")).toBe("passed");
    expect(toBillStatusGroup("adopted")).toBe("passed");
    expect(toBillStatusGroup("partially_adopted")).toBe("passed");
  });

  it("否決はそのまま", () => {
    expect(toBillStatusGroup("rejected")).toBe("rejected");
  });

  // 専決処分の報告は採決を伴わないので、可決に混ぜない。
  it("専決処分報告と上程前は「その他」になる", () => {
    expect(toBillStatusGroup("reported")).toBe("other");
    expect(toBillStatusGroup("preparing")).toBe("other");
  });

  it("カードで「議会審議中」と出るステータスはすべて「審議中」に入る", () => {
    const statuses: BillStatusEnum[] = [
      "preparing",
      "submitted",
      "in_committee",
      "plenary_session",
      "approved",
      "rejected",
      "adopted",
      "partially_adopted",
      "reported",
    ];

    for (const status of statuses) {
      expect(toBillStatusGroup(status) === "deliberating").toBe(
        getCardStatusLabel(status) === "議会審議中"
      );
    }
  });
});

describe("isBillStatusGroup", () => {
  it("既知のグループだけ通す", () => {
    expect(isBillStatusGroup("all")).toBe(true);
    expect(isBillStatusGroup("deliberating")).toBe(true);
    expect(isBillStatusGroup("passed")).toBe(true);
  });

  it("未知の値は弾く", () => {
    expect(isBillStatusGroup("approved")).toBe(false);
    expect(isBillStatusGroup(undefined)).toBe(false);
    expect(isBillStatusGroup(3)).toBe(false);
  });
});

describe("countByStatusGroup", () => {
  it("グループごとに数え、all は総数にする", () => {
    const counts = countByStatusGroup([
      bill("submitted"),
      bill("in_committee"),
      bill("plenary_session"),
      bill("approved"),
      bill("adopted"),
      bill("rejected"),
      bill("reported"),
      bill("preparing"),
    ]);

    expect(counts).toEqual({
      all: 8,
      deliberating: 3,
      passed: 2,
      rejected: 1,
      other: 2,
    });
  });

  it("空なら全て0", () => {
    expect(countByStatusGroup([])).toEqual({
      all: 0,
      deliberating: 0,
      passed: 0,
      rejected: 0,
      other: 0,
    });
  });
});

describe("filterByStatusGroup", () => {
  const bills = [bill("in_committee"), bill("approved"), bill("reported")];

  it("all は素通しする", () => {
    expect(filterByStatusGroup(bills, "all")).toHaveLength(3);
  });

  it("指定グループだけ残す", () => {
    expect(filterByStatusGroup(bills, "passed")).toEqual([bill("approved")]);
  });

  it("該当が無ければ空", () => {
    expect(filterByStatusGroup(bills, "rejected")).toEqual([]);
  });

  it("元の配列を壊さない", () => {
    const input = [bill("approved")];
    filterByStatusGroup(input, "all").push(bill("rejected"));
    expect(input).toHaveLength(1);
  });
});
