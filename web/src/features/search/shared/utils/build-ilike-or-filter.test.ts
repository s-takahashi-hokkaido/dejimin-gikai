import { describe, expect, it } from "vitest";
import { buildIlikeOrFilter } from "./build-ilike-or-filter";

describe("buildIlikeOrFilter", () => {
  it("各カラムの ilike 条件を引用符付きの値でつなぐ", () => {
    expect(buildIlikeOrFilter(["title", "summary"], "子育て支援")).toBe(
      'title.ilike."%子育て支援%",summary.ilike."%子育て支援%"'
    );
  });

  it("カンマ・ピリオド・括弧を含む語も 1 つの値として埋め込む", () => {
    expect(buildIlikeOrFilter(["title"], "a,id.neq.0")).toBe(
      'title.ilike."%a,id.neq.0%"'
    );
    expect(buildIlikeOrFilter(["title"], "R6.予算(案)")).toBe(
      'title.ilike."%R6.予算(案)%"'
    );
  });

  it("引用符を閉じて条件を足そうとする入力をエスケープする", () => {
    expect(buildIlikeOrFilter(["title"], 'x",id.neq."0')).toBe(
      'title.ilike."%x\\",id.neq.\\"0%"'
    );
  });

  it("LIKE のワイルドカードを文字どおりに扱う", () => {
    expect(buildIlikeOrFilter(["title"], "100%_達成")).toBe(
      'title.ilike."%100\\\\%\\\\_達成%"'
    );
  });

  it("バックスラッシュを LIKE と PostgREST の両方でエスケープする", () => {
    // 入力の \ → LIKE で \\ → PostgREST の引用符内で \\\\
    expect(buildIlikeOrFilter(["title"], "a\\b")).toBe(
      'title.ilike."%a\\\\\\\\b%"'
    );
  });
});
