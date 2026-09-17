import { describe, expect, it } from "vitest";
import { type BillCreateInput, billCreateSchema } from "./index";

const validInput: BillCreateInput = {
  bill_number: "議案第1号",
  bill_type: "bill",
  name: "令和７年度札幌市各会計歳入歳出決算認定の件",
  source_url: null,
  status: "submitted",
  status_note: null,
  is_featured: false,
};

function parseSourceUrl(sourceUrl: string | null) {
  return billCreateSchema.safeParse({ ...validInput, source_url: sourceUrl });
}

describe("billCreateSchema", () => {
  describe("bill_type", () => {
    it("定義済みの議案種別を受け付ける", () => {
      const result = billCreateSchema.safeParse({
        ...validInput,
        bill_type: "opinion",
      });
      expect(result.success).toBe(true);
    });

    it("未定義の議案種別を拒否する", () => {
      const result = billCreateSchema.safeParse({
        ...validInput,
        bill_type: "unknown",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("source_url", () => {
    it("null を受け付ける", () => {
      expect(parseSourceUrl(null).success).toBe(true);
    });

    it("https のURLを受け付ける", () => {
      const url =
        "https://www.city.sapporo.jp/gikai/html/documents/08_3t_g01.pdf";
      const result = parseSourceUrl(url);
      expect(result.success).toBe(true);
      expect(result.data?.source_url).toBe(url);
    });

    it("前後の空白を除去する", () => {
      const result = parseSourceUrl("  https://example.com/a.pdf  ");
      expect(result.data?.source_url).toBe("https://example.com/a.pdf");
    });

    it("http(s) 以外のスキームを拒否する", () => {
      expect(parseSourceUrl("javascript:alert(1)").success).toBe(false);
      expect(parseSourceUrl("ftp://example.com/a.pdf").success).toBe(false);
    });

    it("URL形式でない文字列と空文字を拒否する", () => {
      expect(parseSourceUrl("議案PDF").success).toBe(false);
      expect(parseSourceUrl("").success).toBe(false);
    });
  });
});
