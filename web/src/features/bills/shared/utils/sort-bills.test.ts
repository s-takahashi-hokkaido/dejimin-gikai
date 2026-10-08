import { describe, expect, it } from "vitest";
import type { BillStatusEnum } from "../types";
import {
  availableBillSortKeys,
  BILL_SORT_KEYS,
  isBillSortKey,
  sortBills,
} from "./sort-bills";

function bill(
  id: string,
  overrides: {
    bill_number?: string | null;
    published_at?: string | null;
    updated_at?: string;
    status?: BillStatusEnum;
    publicReportCount?: number;
  } = {}
) {
  return {
    id,
    bill_number: null as string | null,
    published_at: "2026-03-01",
    updated_at: "2026-03-01T00:00:00Z",
    status: "submitted" as BillStatusEnum,
    ...overrides,
  };
}

const ids = (bills: { id: string }[]) => bills.map((b) => b.id);

describe("isBillSortKey", () => {
  it("既知のキーだけ通す", () => {
    expect(isBillSortKey("new")).toBe(true);
    expect(isBillSortKey("status")).toBe(true);
    expect(isBillSortKey("voices")).toBe(true);
  });

  it("未知の値は弾く", () => {
    expect(isBillSortKey("popular")).toBe(false);
    expect(isBillSortKey(undefined)).toBe(false);
  });
});

describe("availableBillSortKeys", () => {
  it("インタビューを使うときはすべての並びを出す", () => {
    expect(availableBillSortKeys(true)).toEqual(BILL_SORT_KEYS);
  });

  it("インタビューを使わないときは回答数の並びを外す", () => {
    expect(availableBillSortKeys(false)).not.toContain("voices");
    expect(availableBillSortKeys(false)).toHaveLength(
      BILL_SORT_KEYS.length - 1
    );
  });
});

describe("sortBills", () => {
  it("voices は回答数の多い順", () => {
    const result = sortBills(
      [
        bill("few", { publicReportCount: 3 }),
        bill("many", { publicReportCount: 412 }),
        bill("mid", { publicReportCount: 89 }),
      ],
      "voices"
    );

    expect(ids(result)).toEqual(["many", "mid", "few"]);
  });

  // 回答数を持たない議案を上位に出すと「集まっている順」の意味が壊れる。
  it("voices で回答数が未設定の議案は0扱いで沈む", () => {
    const result = sortBills(
      [bill("unknown"), bill("some", { publicReportCount: 1 })],
      "voices"
    );

    expect(ids(result)).toEqual(["some", "unknown"]);
  });

  it("new は提出日の新しい順", () => {
    const result = sortBills(
      [
        bill("old", { published_at: "2026-01-01" }),
        bill("new", { published_at: "2026-05-01" }),
        bill("mid", { published_at: "2026-03-01" }),
      ],
      "new"
    );

    expect(ids(result)).toEqual(["new", "mid", "old"]);
  });

  it("old は提出日の古い順", () => {
    const result = sortBills(
      [
        bill("new", { published_at: "2026-05-01" }),
        bill("old", { published_at: "2026-01-01" }),
      ],
      "old"
    );

    expect(ids(result)).toEqual(["old", "new"]);
  });

  // 提出日なしを先頭に出すと「新しい順」の意味が壊れる。
  it("提出日が無い議案は昇順でも降順でも最後尾にする", () => {
    const bills = [
      bill("none", { published_at: null }),
      bill("dated", { published_at: "2026-01-01" }),
    ];

    expect(ids(sortBills(bills, "new"))).toEqual(["dated", "none"]);
    expect(ids(sortBills(bills, "old"))).toEqual(["dated", "none"]);
  });

  it("updated は更新の新しい順", () => {
    const result = sortBills(
      [
        bill("stale", { updated_at: "2026-01-01T00:00:00Z" }),
        bill("fresh", { updated_at: "2026-07-01T00:00:00Z" }),
      ],
      "updated"
    );

    expect(ids(result)).toEqual(["fresh", "stale"]);
  });

  it("status は BILL_STATUS_ORDER に従う", () => {
    const result = sortBills(
      [
        bill("preparing", { status: "preparing" }),
        bill("approved", { status: "approved" }),
        bill("in_committee", { status: "in_committee" }),
      ],
      "status"
    );

    expect(ids(result)).toEqual(["approved", "in_committee", "preparing"]);
  });

  // 定例会ごとに数十件が同じ提出日を持つ。並びが決まらないと、ページを
  // またいで同じ議案が重複したり抜けたりする。
  it("提出日が同じなら議案番号の自然順に並べる", () => {
    const result = sortBills(
      [
        bill("no10", { bill_number: "議案第10号" }),
        bill("no2", { bill_number: "議案第2号" }),
        bill("no1", { bill_number: "議案第1号" }),
      ],
      "new"
    );

    expect(ids(result)).toEqual(["no1", "no2", "no10"]);
  });

  it("提出日の古い順でも同点は議案番号の順にする", () => {
    const result = sortBills(
      [
        bill("no2", { bill_number: "議案第2号" }),
        bill("no1", { bill_number: "議案第1号" }),
      ],
      "old"
    );

    expect(ids(result)).toEqual(["no1", "no2"]);
  });

  it("議案番号も同じなら id で並べ、入力の順に左右されない", () => {
    const a = bill("a", { bill_number: "請願第5号" });
    const b = bill("b", { bill_number: "請願第5号" });

    expect(ids(sortBills([b, a], "new"))).toEqual(["a", "b"]);
    expect(ids(sortBills([a, b], "new"))).toEqual(["a", "b"]);
  });

  it("回答数が同じなら提出日の新しい順にする", () => {
    const result = sortBills(
      [
        bill("older", { published_at: "2026-02-11", publicReportCount: 0 }),
        bill("newer", { published_at: "2026-09-23", publicReportCount: 0 }),
      ],
      "voices"
    );

    expect(ids(result)).toEqual(["newer", "older"]);
  });

  it("審議状況が同じなら提出日の新しい順、次に議案番号の順にする", () => {
    const result = sortBills(
      [
        bill("old-no1", {
          status: "approved",
          published_at: "2026-02-11",
          bill_number: "議案第1号",
        }),
        bill("new-no2", {
          status: "approved",
          published_at: "2026-09-23",
          bill_number: "議案第2号",
        }),
        bill("new-no1", {
          status: "approved",
          published_at: "2026-09-23",
          bill_number: "議案第1号",
        }),
      ],
      "status"
    );

    expect(ids(result)).toEqual(["new-no1", "new-no2", "old-no1"]);
  });

  it("元の配列を壊さない", () => {
    const input = [
      bill("a", { published_at: "2026-01-01" }),
      bill("b", { published_at: "2026-05-01" }),
    ];
    sortBills(input, "new");

    expect(ids(input)).toEqual(["a", "b"]);
  });

  it("空配列でも落ちない", () => {
    expect(sortBills([], "new")).toEqual([]);
  });
});
