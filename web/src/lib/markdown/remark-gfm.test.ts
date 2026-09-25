import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { describe, expect, it } from "vitest";

/**
 * parseMarkdown と同じ remark プラグイン構成（remarkGfm + remarkBreaks）と
 * rehypeSanitize を通して、GFMテーブルがHTMLのtableとして出力されることを検証する。
 */
async function render(markdown: string, withGfm = true): Promise<string> {
  const remarkProcessor = withGfm
    ? unified()
        .use(remarkParse)
        .use(remarkGfm, { singleTilde: false })
        .use(remarkBreaks)
    : unified().use(remarkParse).use(remarkBreaks);
  const parsed = remarkProcessor.parse(markdown);
  const mdast = (await remarkProcessor.run(parsed)) as typeof parsed;

  const hast = await unified()
    .use(remarkRehype)
    .use(rehypeSanitize, defaultSchema)
    .run(mdast);

  return unified()
    .use(rehypeStringify)
    .stringify(hast as never)
    .toString();
}

const TABLE_MARKDOWN = `次の例外を加える。

| 号 | 対象 | 範囲 |
|---|---|---|
| 1号 | 6歳に達する日以後の最初の3月31日までの間にある子ども | 全ての医療 |
| 2号 | その翌日以後、12歳に達する日以後の最初の3月31日までの間にある子ども | 入院又は指定訪問看護に係る医療費の助成を受けるときに限る |`;

describe("remarkGfm（テーブル）", () => {
  it("GFMテーブルがtable/thead/tbody/th/tdに変換される", async () => {
    const output = await render(TABLE_MARKDOWN);

    expect(output).toContain("<table>");
    expect(output).toContain("<thead>");
    expect(output).toContain("<tbody>");
    expect(output).toContain("<th>号</th>");
    expect(output).toContain("<td>1号</td>");
    expect(output).not.toContain("|---|");
  });

  it("データ行が2行、ヘッダー行が1行になる", async () => {
    const output = await render(TABLE_MARKDOWN);

    expect(output.match(/<tr>/g)).toHaveLength(3);
    expect(output.match(/<th>/g)).toHaveLength(3);
  });

  it("テーブル前後の通常テキストは段落のまま残る", async () => {
    const output = await render(`前の文\n\n${TABLE_MARKDOWN}\n\n後の文`);

    expect(output).toContain("<p>前の文</p>");
    expect(output).toContain("<p>後の文</p>");
  });

  it("~ 1つの範囲表記は取り消し線にならない（singleTilde: false）", async () => {
    const output = await render("予算は10~20億円、30~40億円");

    expect(output).not.toContain("<del>");
    expect(output).toContain("10~20億円");
  });

  it("remarkGfmが無いとテーブルにならない（従来の問題）", async () => {
    const output = await render(TABLE_MARKDOWN, false);

    expect(output).not.toContain("<table>");
    expect(output).toContain("|---|---|---|");
  });
});
