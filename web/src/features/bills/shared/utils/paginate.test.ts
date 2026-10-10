import { describe, expect, it } from "vitest";
import { pageLinks, paginate } from "./paginate";

const range = (length: number) => Array.from({ length }, (_, i) => i + 1);

describe("paginate", () => {
  it("指定ページの分だけ切り出す", () => {
    expect(paginate(range(45), 2, 20)).toEqual({
      items: range(20).map((n) => n + 20),
      page: 2,
      totalPages: 3,
      from: 21,
      to: 40,
    });
  });

  it("最後のページは端数だけを返す", () => {
    const result = paginate(range(45), 3, 20);
    expect(result.items).toEqual([41, 42, 43, 44, 45]);
    expect(result.from).toBe(41);
    expect(result.to).toBe(45);
  });

  it("ちょうど割り切れるときに空のページを作らない", () => {
    expect(paginate(range(40), 1, 20).totalPages).toBe(2);
  });

  // 絞り込みで件数が減ったあとに古いURLを開いても、空のページを出さない。
  it("総ページ数を超える番号は最後のページに丸める", () => {
    const result = paginate(range(45), 9, 20);
    expect(result.page).toBe(3);
    expect(result.items).toEqual([41, 42, 43, 44, 45]);
  });

  it("1未満や数値でない番号は1ページ目に丸める", () => {
    expect(paginate(range(45), 0, 20).page).toBe(1);
    expect(paginate(range(45), -3, 20).page).toBe(1);
    expect(paginate(range(45), Number.NaN, 20).page).toBe(1);
  });

  it("0件でも1ページとして返す", () => {
    expect(paginate([], 1, 20)).toEqual({
      items: [],
      page: 1,
      totalPages: 1,
      from: 0,
      to: 0,
    });
  });

  it("1ページあたりの件数が正の整数でなければ投げる", () => {
    expect(() => paginate(range(3), 1, 0)).toThrow(RangeError);
    expect(() => paginate(range(3), 1, 1.5)).toThrow(RangeError);
  });

  it("元の配列を壊さない", () => {
    const input = range(5);
    paginate(input, 1, 2).items.push(99);
    expect(input).toEqual(range(5));
  });
});

describe("pageLinks", () => {
  it("ページが少なければすべて並べる", () => {
    expect(pageLinks(1, 3)).toEqual([1, 2, 3]);
  });

  it("1ページなら1だけ", () => {
    expect(pageLinks(1, 1)).toEqual([1]);
  });

  it("ページが無ければ空", () => {
    expect(pageLinks(1, 0)).toEqual([]);
  });

  it("先頭では末尾との間を省略する", () => {
    expect(pageLinks(1, 10)).toEqual([1, 2, "ellipsis", 10]);
  });

  it("末尾では先頭との間を省略する", () => {
    expect(pageLinks(10, 10)).toEqual([1, "ellipsis", 9, 10]);
  });

  it("中ほどでは両側を省略する", () => {
    expect(pageLinks(5, 10)).toEqual([1, "ellipsis", 4, 5, 6, "ellipsis", 10]);
  });

  // 記号の代わりに番号を出せば、隠れたページにも直接行ける。
  it("1ページ分しか隠れないときは省略せずに番号を出す", () => {
    expect(pageLinks(3, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(pageLinks(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});
