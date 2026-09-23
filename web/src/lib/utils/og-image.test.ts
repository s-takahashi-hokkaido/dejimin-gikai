import { describe, expect, it } from "vitest";
import { siteConfig } from "@/config/site.config";
import { resolveDefaultOgImageUrl } from "./og-image";

describe("resolveDefaultOgImageUrl", () => {
  it("ベース URL と結合した絶対 URL を返す", () => {
    expect(resolveDefaultOgImageUrl("https://example.com")).toBe(
      "https://example.com/ogp.png"
    );
  });

  it("末尾スラッシュ付きのベース URL でもパスが重複しない", () => {
    expect(resolveDefaultOgImageUrl("https://example.com/")).toBe(
      "https://example.com/ogp.png"
    );
  });

  it("ポート付きのベース URL を保持する", () => {
    expect(resolveDefaultOgImageUrl("http://localhost:3000")).toBe(
      "http://localhost:3000/ogp.png"
    );
  });

  it("SNS が解釈できない SVG ではなく PNG を指す", () => {
    expect(siteConfig.ogImage.path).toMatch(/\.png$/);
    expect(resolveDefaultOgImageUrl("https://example.com")).not.toMatch(
      /\.svg$/
    );
  });
});
