import {
  cleanupTestBill,
  createTestBill,
  createTestBillContent,
} from "@test-utils/utils";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { searchBills } from "./search-repository";

/**
 * 検索語は PostgREST の or() フィルタに埋め込まれる。
 * 記号を含む語でもフィルタ条件が書き換わらず、文字どおりに検索されることを
 * 実際の PostgREST で確かめる。
 */
describe("searchBills 統合テスト（検索語の記号）", () => {
  const suffix = `${Date.now()}`;
  const billIds: string[] = [];
  let symbolBillId = "";
  let plainBillId = "";

  beforeAll(async () => {
    const symbolBill = await createTestBill({ publish_status: "published" });
    billIds.push(symbolBill.id);
    symbolBillId = symbolBill.id;
    await createTestBillContent(symbolBill.id, {
      title: `R6.補正予算(案),100%_達成 "引用" a\\b ${suffix}`,
      summary: "サマリー",
    });

    const plainBill = await createTestBill({ publish_status: "published" });
    billIds.push(plainBill.id);
    plainBillId = plainBill.id;
    await createTestBillContent(plainBill.id, {
      title: `ふつうの議案 ${suffix}`,
      summary: "サマリー",
    });
  });

  afterAll(async () => {
    for (const id of billIds) {
      await cleanupTestBill(id);
    }
  });

  async function searchIds(query: string): Promise<string[]> {
    const results = await searchBills(query);
    return results.map((r) => r.id).filter((id) => billIds.includes(id));
  }

  it("ピリオド・括弧・カンマを含む語で検索できる", async () => {
    expect(await searchIds("R6.補正予算(案),100")).toEqual([symbolBillId]);
  });

  it("引用符・バックスラッシュを含む語で検索できる", async () => {
    expect(await searchIds('"引用" a\\b')).toEqual([symbolBillId]);
  });

  it("% と _ はワイルドカードではなく文字として扱う", async () => {
    expect(await searchIds("100%_達成")).toEqual([symbolBillId]);
    // ワイルドカードとして効くなら「ふつう」の議案にも一致してしまう
    expect(await searchIds(`%${suffix}`)).toEqual([]);
  });

  it("フィルタ条件を足そうとする入力で他の議案が引っかからない", async () => {
    expect(await searchIds(`x,title.ilike.*${suffix}*`)).toEqual([]);
    expect(await searchIds(`x",title.ilike."*${suffix}*`)).toEqual([]);
    expect(await searchIds(`ふつうの議案 ${suffix}`)).toEqual([plainBillId]);
  });
});
