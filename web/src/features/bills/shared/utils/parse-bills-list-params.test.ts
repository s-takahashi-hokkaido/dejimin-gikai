import { describe, expect, it } from "vitest";
import {
  type BillsListParams,
  billsListHref,
  buildBillsListQuery,
  parseBillsListParams,
} from "./parse-bills-list-params";

const defaults: BillsListParams = {
  query: "",
  status: "all",
  tagId: null,
  sort: "new",
  interviewOnly: false,
  page: 1,
};

describe("parseBillsListParams", () => {
  it("何も無ければ既定に倒す", () => {
    expect(parseBillsListParams({})).toEqual(defaults);
  });

  it("すべてのパラメータを読む", () => {
    expect(
      parseBillsListParams({
        q: "除雪",
        status: "passed",
        tag: "snow",
        sort: "old",
        interview: "1",
        page: "3",
      })
    ).toEqual({
      query: "除雪",
      status: "passed",
      tagId: "snow",
      sort: "old",
      interviewOnly: true,
      page: 3,
    });
  });

  // URL 直打ちでページを壊せないようにする。
  it("不正なステータスと並び順は既定に倒す", () => {
    const parsed = parseBillsListParams({
      status: "approved",
      sort: "popular",
    });
    expect(parsed.status).toBe("all");
    expect(parsed.sort).toBe("new");
  });

  it("配列で来たら先頭を採る", () => {
    expect(
      parseBillsListParams({
        q: ["a", "b"],
        status: ["passed", "all"],
        page: ["2", "5"],
      })
    ).toMatchObject({ query: "a", status: "passed", page: 2 });
  });

  it("前後の空白を落とす", () => {
    expect(parseBillsListParams({ q: "  除雪  " }).query).toBe("除雪");
  });

  it("空文字のタグは「すべて」扱いにする", () => {
    expect(parseBillsListParams({ tag: "   " }).tagId).toBeNull();
  });

  it("interview は 1 のときだけ真", () => {
    expect(parseBillsListParams({ interview: "1" }).interviewOnly).toBe(true);
    expect(parseBillsListParams({ interview: "true" }).interviewOnly).toBe(
      false
    );
    expect(parseBillsListParams({ interview: "0" }).interviewOnly).toBe(false);
  });

  it.each([
    "0",
    "-1",
    "1.5",
    "abc",
    "",
    "1e3",
    "99999999999999999999",
  ])("正の整数でないページ番号「%s」は1ページ目に倒す", (page) => {
    expect(parseBillsListParams({ page }).page).toBe(1);
  });

  // 総数は絞り込みのあとで決まるので、ここでは上限で丸めない。
  it("大きなページ番号はそのまま読む", () => {
    expect(parseBillsListParams({ page: "120" }).page).toBe(120);
  });

  describe("AIインタビューを使わない設定", () => {
    const options = { interviewEnabled: false };

    it("受付中の絞り込みを無視する", () => {
      expect(
        parseBillsListParams({ interview: "1" }, options).interviewOnly
      ).toBe(false);
    });

    it("回答数の並びを既定に倒す", () => {
      expect(parseBillsListParams({ sort: "voices" }, options).sort).toBe(
        "new"
      );
    });

    it("他の並びはそのまま読む", () => {
      expect(parseBillsListParams({ sort: "old" }, options).sort).toBe("old");
    });
  });
});

describe("buildBillsListQuery", () => {
  it("既定だけならクエリを付けない", () => {
    expect(buildBillsListQuery(defaults, {})).toBe("");
  });

  it("既定値はURLに出さない", () => {
    expect(
      buildBillsListQuery(defaults, { status: "all", sort: "new", page: 1 })
    ).toBe("");
  });

  it("差し替えた値だけ載せる", () => {
    expect(buildBillsListQuery(defaults, { status: "passed" })).toBe(
      "?status=passed"
    );
  });

  it("他の絞り込みを保ったまま1つだけ差し替える", () => {
    const current: BillsListParams = {
      ...defaults,
      query: "税",
      tagId: "zeikin",
    };

    expect(buildBillsListQuery(current, { status: "rejected" })).toBe(
      "?q=%E7%A8%8E&status=rejected&tag=zeikin"
    );
  });

  it("インタビュー絞り込みは 1 で載せる", () => {
    expect(buildBillsListQuery(defaults, { interviewOnly: true })).toBe(
      "?interview=1"
    );
  });

  it("タグを外せる", () => {
    const current: BillsListParams = { ...defaults, tagId: "zeikin" };
    expect(buildBillsListQuery(current, { tagId: null })).toBe("");
  });

  it("ページ番号を載せる", () => {
    expect(buildBillsListQuery(defaults, { page: 2 })).toBe("?page=2");
  });

  // 前の条件のページ番号を引き継ぐと、件数が減ったときに範囲外を指す。
  it("絞り込みを変えたら1ページ目に戻す", () => {
    const current: BillsListParams = { ...defaults, page: 4 };

    expect(buildBillsListQuery(current, { status: "passed" })).toBe(
      "?status=passed"
    );
    expect(buildBillsListQuery(current, { sort: "old" })).toBe("?sort=old");
  });

  it("ページだけ送るときは他の絞り込みを保つ", () => {
    const current: BillsListParams = {
      ...defaults,
      tagId: "zeikin",
      page: 2,
    };

    expect(buildBillsListQuery(current, { page: 3 })).toBe(
      "?tag=zeikin&page=3"
    );
  });

  it("parse と往復して同じ状態に戻る", () => {
    const current: BillsListParams = {
      query: "除雪",
      status: "passed",
      tagId: "snow",
      sort: "old",
      interviewOnly: true,
      page: 2,
    };
    const queryString = buildBillsListQuery(current, { page: current.page });
    const parsed = Object.fromEntries(
      new URLSearchParams(queryString.slice(1))
    );

    expect(parseBillsListParams(parsed)).toEqual(current);
  });
});

describe("billsListHref", () => {
  it("一覧のパスにクエリを付ける", () => {
    expect(billsListHref(defaults, { tagId: "snow" })).toBe("/bills?tag=snow");
  });

  it("既定だけならパスのみ", () => {
    expect(billsListHref(defaults)).toBe("/bills");
  });
});
