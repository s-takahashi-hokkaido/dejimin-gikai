import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { parseMarkdown } from "./index";

async function renderHtml(markdown: string): Promise<string> {
  return renderToStaticMarkup(await parseMarkdown(markdown));
}

describe("parseMarkdown", () => {
  it("should not allow malicious iframe elements", async () => {
    const markdown = `<iframe src="https://malicious.com/evil" onload="alert('XSS')"></iframe>

https://www.youtube.com/watch?v=safe123`;

    const html = await renderHtml(markdown);

    // 悪意のあるiframeは削除され、YouTube埋め込みだけが残ることを確認
    expect(html).not.toContain("malicious.com");
    expect(html).not.toContain("onload");
    expect(html).toContain('src="https://www.youtube.com/embed/safe123"');
  });

  describe("GFMテーブル", () => {
    const tableMarkdown = `次の例外を加える。

| 号 | 対象 | 範囲 |
|---|---|---|
| 1号 | 6歳に達する日以後の最初の3月31日までの間にある子ども | 全ての医療 |
| 2号 | その翌日以後、12歳に達する日以後の最初の3月31日までの間にある子ども | 入院又は指定訪問看護に係る医療費の助成を受けるときに限る |`;

    it("テーブルがtable/thead/tbody/th/tdとして描画される", async () => {
      const html = await renderHtml(tableMarkdown);

      expect(html).toContain("<table>");
      expect(html).toContain("<thead>");
      expect(html).toContain("<tbody>");
      expect(html).toContain("<th>号</th>");
      expect(html).toContain("<td>1号</td>");
      // 記法の文字がそのまま表示されない
      expect(html).not.toContain("|---|");
    });

    it("ヘッダー1行・データ2行になる", async () => {
      const html = await renderHtml(tableMarkdown);

      expect(html.match(/<tr>/g)).toHaveLength(3);
      expect(html.match(/<th>/g)).toHaveLength(3);
    });

    it("テーブル前後の通常テキストは段落のまま残る", async () => {
      const html = await renderHtml(`前の文\n\n${tableMarkdown}\n\n後の文`);

      expect(html).toContain("<p>前の文</p>");
      expect(html).toContain("<p>後の文</p>");
    });

    it("列の寄せ指定（:---:）はtext-alignとして保持される", async () => {
      const html = await renderHtml(
        `| 款 | 金額 |\n|:---:|---:|\n| 市税 | 3,987億円 |`
      );

      expect(html).toContain('<th style="text-align:center">款</th>');
      expect(html).toContain('<th style="text-align:right">金額</th>');
    });
  });

  it("~ 1つの範囲表記は取り消し線にならない", async () => {
    const html = await renderHtml("予算は10~20億円、30~40億円");

    expect(html).not.toContain("<del>");
    expect(html).toContain("10~20億円");
  });

  describe("YouTube埋め込み（GFMの自動リンク化との併用）", () => {
    it("文中のYouTube URLは埋め込まず、前後の文章を消さない", async () => {
      const html = await renderHtml(
        "動画はこちら https://www.youtube.com/watch?v=abc123 をご覧ください。"
      );

      expect(html).not.toContain("<iframe");
      expect(html).toContain("動画はこちら");
      expect(html).toContain("をご覧ください。");
    });
  });
});
