import { describe, expect, it } from "vitest";
import { BILL_TYPES } from "../types";
import { toBillType } from "./to-bill-type";

describe("toBillType", () => {
  it("定義済みの議案種別はそのまま返す", () => {
    for (const type of BILL_TYPES) {
      expect(toBillType(type)).toBe(type);
    }
  });

  it("未知の値は bill として扱う", () => {
    expect(toBillType("unknown")).toBe("bill");
    expect(toBillType("")).toBe("bill");
  });
});
