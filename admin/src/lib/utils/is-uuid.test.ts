import { describe, expect, it } from "vitest";
import { isUuid } from "./is-uuid";

describe("isUuid", () => {
  it.each([
    "11111111-1111-1111-1111-111111111111",
    "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    "A1B2C3D4-E5F6-4A7B-8C9D-0E1F2A3B4C5D",
  ])("UUID の形なら true: %s", (value) => {
    expect(isUuid(value)).toBe(true);
  });

  it.each([
    "",
    "new",
    "11111111-1111-1111-1111-11111111111",
    "11111111-1111-1111-1111-1111111111111",
    "11111111111111111111111111111111",
    " 11111111-1111-1111-1111-111111111111",
    "g1111111-1111-1111-1111-111111111111",
    null,
    undefined,
    1,
  ])("それ以外は false: %j", (value) => {
    expect(isUuid(value)).toBe(false);
  });
});
