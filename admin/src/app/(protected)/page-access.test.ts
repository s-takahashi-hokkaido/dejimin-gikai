import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * (protected) 配下のすべての page.tsx が、自分のルートで requirePageAccess を呼んでいるか
 *
 * レイアウトはクライアント遷移で再実行されないため、ロールの確認はページごとに要る。
 * ページを足したときに呼び忘れると、ナビゲーションに出ないだけで URL を直接開けてしまう。
 */
const PROTECTED_DIR = __dirname;

function findPages(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return findPages(fullPath);
    }
    return entry.name === "page.tsx" ? [fullPath] : [];
  });
}

function toRoute(pagePath: string): string {
  const relativeDir = path.relative(PROTECTED_DIR, path.dirname(pagePath));
  return `/${relativeDir.split(path.sep).join("/")}`;
}

const pages = findPages(PROTECTED_DIR).map((pagePath) => ({
  route: toRoute(pagePath),
  source: readFileSync(pagePath, "utf8"),
}));

describe("(protected) のページガード", () => {
  it("ページが見つかる", () => {
    expect(pages.length).toBeGreaterThan(0);
  });

  it.each(pages)("$route は requirePageAccess を呼ぶ", ({ route, source }) => {
    expect(source).toContain(`requirePageAccess("${route}")`);
  });
});
