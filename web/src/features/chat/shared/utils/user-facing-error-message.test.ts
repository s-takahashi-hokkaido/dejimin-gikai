import { describe, expect, it } from "vitest";
import {
  DAILY_COST_LIMIT_MESSAGE,
  GENERIC_ERROR_MESSAGE,
  toUserFacingErrorMessage,
} from "./user-facing-error-message";

describe("toUserFacingErrorMessage", () => {
  it("上限到達の文面はそのまま返す", () => {
    expect(toUserFacingErrorMessage(DAILY_COST_LIMIT_MESSAGE)).toBe(
      DAILY_COST_LIMIT_MESSAGE
    );
  });

  it("汎用の文面はそのまま返す", () => {
    expect(toUserFacingErrorMessage(GENERIC_ERROR_MESSAGE)).toBe(
      GENERIC_ERROR_MESSAGE
    );
  });

  it("OpenAI の生エラーは汎用の文面に置き換える", () => {
    expect(
      toUserFacingErrorMessage(
        "Failed after 3 attempts. Last error: You exceeded your current quota, please check your plan and billing details."
      )
    ).toBe(GENERIC_ERROR_MESSAGE);
  });

  it("ブラウザのネットワークエラーは汎用の文面に置き換える", () => {
    expect(toUserFacingErrorMessage("Failed to fetch")).toBe(
      GENERIC_ERROR_MESSAGE
    );
  });

  it("空文字・undefined は汎用の文面を返す", () => {
    expect(toUserFacingErrorMessage("")).toBe(GENERIC_ERROR_MESSAGE);
    expect(toUserFacingErrorMessage(undefined)).toBe(GENERIC_ERROR_MESSAGE);
  });
});
