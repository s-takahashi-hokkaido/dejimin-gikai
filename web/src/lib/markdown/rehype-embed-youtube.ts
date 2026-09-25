import type { Element, Root } from "hast";
import { visit } from "unist-util-visit";

/**
 * YouTube URLからビデオIDを抽出する
 */
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * p要素の子から、埋め込み候補となるURL文字列を取り出す。
 * - テキストノード: 行ごとに分割してトリムしたもの
 * - 自動リンク（remark-gfmがURLをaに変換したもの）: リンクテキストがhrefと同一のaのhref
 *   （[説明](url) のような明示的なリンクは対象外）
 */
function collectCandidateUrls(node: Element): string[] {
  const urls: string[] = [];

  for (const child of node.children) {
    if (child.type === "text") {
      for (const line of child.value.split("\n")) {
        urls.push(line.trim());
      }
    } else if (child.type === "element" && child.tagName === "a") {
      const href = child.properties?.href;
      const [linkText] = child.children;
      if (
        typeof href === "string" &&
        child.children.length === 1 &&
        linkText.type === "text" &&
        linkText.value === href
      ) {
        urls.push(href);
      }
    }
  }

  return urls;
}

/**
 * YouTube URLをiframeに変換するrehypeプラグイン
 */
export function rehypeEmbedYouTube() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element, index, parent) => {
      if (node.tagName === "p" && parent && typeof index === "number") {
        for (const url of collectCandidateUrls(node)) {
          if (!url.startsWith("https://")) continue;

          const youtubeId = extractYouTubeId(url);
          if (youtubeId) {
            // YouTube URLを見つけた場合、iframe要素に置き換え
            const iframe: Element = {
              type: "element",
              tagName: "iframe",
              properties: {
                src: `https://www.youtube.com/embed/${youtubeId}`,
                frameborder: "0",
                allow:
                  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
                allowfullscreen: true,
                className: ["youtube-embed"],
              },
              children: [],
            };

            // p要素をiframe要素に置き換え
            parent.children[index] = iframe;
            return;
          }
        }
      }
    });
  };
}
