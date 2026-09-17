import { describe, expect, it } from "vitest";
import { mapBillDbError } from "./map-bill-db-error";

describe("mapBillDbError", () => {
  it("23505コード（UNIQUE制約違反）で重複メッセージを返す", () => {
    const error = { code: "23505", message: "duplicate key value" };
    const expected =
      "同じ定例会に、同じ議案番号・議案種別の議案が既に存在します";
    expect(mapBillDbError(error, "作成")).toBe(expected);
    expect(mapBillDbError(error, "更新")).toBe(expected);
  });

  it("未知のエラーコードでは操作名付きの汎用メッセージを返す", () => {
    const error = { code: "23514", message: "check constraint violated" };
    expect(mapBillDbError(error, "作成")).toBe(
      "議案の作成に失敗しました: check constraint violated"
    );
    expect(mapBillDbError(error, "更新")).toBe(
      "議案の更新に失敗しました: check constraint violated"
    );
  });
});
