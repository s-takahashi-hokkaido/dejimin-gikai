import { describe, expect, it } from "vitest";
import { searchBills } from "./search-bills";

function bill(
  id: string,
  overrides: {
    name?: string;
    billNumber?: string | null;
    title?: string | null;
    summary?: string | null;
    tags?: string[];
  } = {}
) {
  return {
    id,
    name: overrides.name ?? "札幌市敬老健康パス条例の一部を改正する条例案",
    bill_number:
      overrides.billNumber === undefined ? "議案第12号" : overrides.billNumber,
    bill_content:
      overrides.title === null && overrides.summary === null
        ? undefined
        : ({
            title: overrides.title ?? "敬老パスの使い道を広げる",
            summary:
              overrides.summary ?? "地下鉄に加えてタクシーにも使えます。",
          } as never),
    tags: (overrides.tags ?? ["福祉・医療"]).map((label) => ({
      id: label,
      label,
    })),
  };
}

const ids = (bills: { id: string }[]) => bills.map((b) => b.id);

describe("searchBills", () => {
  it("正式名称に当てる", () => {
    expect(ids(searchBills([bill("a")], "健康パス条例"))).toEqual(["a"]);
  });

  it("わかりやすいタイトルに当てる", () => {
    expect(ids(searchBills([bill("a")], "使い道"))).toEqual(["a"]);
  });

  it("要約に当てる", () => {
    expect(ids(searchBills([bill("a")], "タクシー"))).toEqual(["a"]);
  });

  // カテゴリ名で探す利用者がいる。
  it("タグ名に当てる", () => {
    expect(
      ids(searchBills([bill("a", { tags: ["子育て・教育"] })], "子育て"))
    ).toEqual(["a"]);
  });

  // 市の資料を見て番号で探す利用者がいる。
  it("議案番号に当てる", () => {
    expect(ids(searchBills([bill("a")], "議案第12号"))).toEqual(["a"]);
  });

  it("議案番号の全角数字も同一視する", () => {
    expect(ids(searchBills([bill("a")], "議案第１２号"))).toEqual(["a"]);
  });

  it("議案番号が無くても落ちない", () => {
    const target = bill("a", { billNumber: null });
    expect(ids(searchBills([target], "健康パス"))).toEqual(["a"]);
    expect(searchBills([target], "議案第12号")).toEqual([]);
  });

  it("一致しなければ空", () => {
    expect(searchBills([bill("a")], "宇宙")).toEqual([]);
  });

  it("空クエリは絞り込まない", () => {
    const bills = [bill("a"), bill("b")];
    expect(ids(searchBills(bills, ""))).toEqual(["a", "b"]);
    expect(ids(searchBills(bills, "   "))).toEqual(["a", "b"]);
  });

  // 「AI」を「ＡＩ」と打つ利用者を取りこぼさない。
  it("全角と半角を同一視する", () => {
    const target = bill("a", { title: "AIの活用を進める" });
    expect(ids(searchBills([target], "ＡＩ"))).toEqual(["a"]);
    expect(ids(searchBills([target], "ai"))).toEqual(["a"]);
  });

  it("クエリ中の空白を無視する", () => {
    expect(ids(searchBills([bill("a")], "敬老 パス"))).toEqual(["a"]);
  });

  it("bill_content が無くても落ちない", () => {
    const target = bill("a", { title: null, summary: null });
    expect(ids(searchBills([target], "健康パス条例"))).toEqual(["a"]);
    expect(searchBills([target], "使い道")).toEqual([]);
  });

  it("元の配列を壊さない", () => {
    const input = [bill("a")];
    searchBills(input, "").push(bill("b"));
    expect(input).toHaveLength(1);
  });
});
