import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 議題の Server Action が、先頭で機能フラグとロールを確かめているか
 *
 * Server Action は画面に導線が無くても直接呼べる。足した Action で確認を忘れると、
 * フラグがオフの間や運営者からも書き込めてしまうので、ファイルの中身で確かめる。
 * 「自分の議題か」の判定（validateTopicEdit など）は topic-permissions.test.ts で確かめる。
 */
const ACTIONS_DIR = __dirname;

/** export した Server Action の本体で、最初に await している式 */
function firstAwaitedCall(source: string): string | null {
  const body = source.slice(source.indexOf("export async function"));
  const match = body.match(/await\s+([\w.]+)\(/);
  return match ? match[1] : null;
}

const actions = readdirSync(ACTIONS_DIR)
  .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
  .map((name) => ({
    name,
    source: readFileSync(path.join(ACTIONS_DIR, name), "utf8"),
  }));

describe("議題の Server Action のガード", () => {
  it("Server Action が見つかる", () => {
    expect(actions.length).toBeGreaterThan(0);
  });

  it.each(actions)("$name は Server Action として宣言されている", ({
    source,
  }) => {
    expect(source.startsWith('"use server";')).toBe(true);
  });

  it.each(actions)("$name は、ほかの処理より先に requirePlazaAuthor を待つ", ({
    source,
  }) => {
    expect(firstAwaitedCall(source)).toBe("requirePlazaAuthor");
  });
});
