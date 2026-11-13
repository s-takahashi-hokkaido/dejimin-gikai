import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * AIインタビュー広場のページが、機能フラグ（ADMIN_ENABLE_PLAZA）を確かめているか
 *
 * 公開までは、フラグがオフなら画面を開けないようにする（実装タスク分割 §0）。
 * ナビから隠すだけでは URL を直接開けてしまうので、ページごとに確かめる。
 */
const PLAZA_DIR = __dirname;

function findPages(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return findPages(fullPath);
    }
    return entry.name === "page.tsx" ? [fullPath] : [];
  });
}

const pages = findPages(PLAZA_DIR).map((pagePath) => ({
  page: path.relative(PLAZA_DIR, pagePath),
  source: readFileSync(pagePath, "utf8"),
}));

describe("AIインタビュー広場のページの機能フラグ", () => {
  it("ページが見つかる", () => {
    expect(pages.length).toBeGreaterThan(0);
  });

  it.each(
    pages
  )("$page は、認可やデータの取得より先に notFoundUnlessPlazaEnabled を呼ぶ", ({
    source,
  }) => {
    const body = source.slice(source.indexOf("export default async function"));
    const flagCheck = body.indexOf("notFoundUnlessPlazaEnabled()");
    const firstAwait = body.indexOf("await ");

    expect(flagCheck).toBeGreaterThan(-1);
    expect(firstAwait === -1 || flagCheck < firstAwait).toBe(true);
  });
});
