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

type ParagraphChild = Element["children"][number];

/**
 * 兄弟ノード側から見て、リンクが行の端（段落の端・<br>・改行）に接しているか。
 * 直前/直後の空白のみのテキストは読み飛ばして判定する。
 */
function isLineBoundary(
  children: ParagraphChild[],
  start: number,
  step: 1 | -1
): boolean {
  for (let i = start; i >= 0 && i < children.length; i += step) {
    const sibling = children[i];
    if (sibling.type === "text") {
      if (sibling.value.trim() === "") continue;
      // 隣接テキストが改行で終わる/始まるなら行の端
      return step === -1
        ? sibling.value.endsWith("\n")
        : sibling.value.startsWith("\n");
    }
    return sibling.type === "element" && sibling.tagName === "br";
  }
  return true;
}

/**
 * p要素の子から、埋め込み候補となるURL文字列を取り出す。
 * - テキストノード: 行ごとに分割してトリムしたもの
 * - 自動リンク（remark-gfmがURLをaに変換したもの）: リンクテキストがhrefと同一で、
 *   かつ行に単独で置かれているaのhref
 *   （[説明](url) のような明示的なリンクや、文中のURLは対象外）
 */
function collectCandidateUrls(node: Element): string[] {
  const urls: string[] = [];

  node.children.forEach((child, i) => {
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
        linkText.value === href &&
        isLineBoundary(node.children, i - 1, -1) &&
        isLineBoundary(node.children, i + 1, 1)
      ) {
        urls.push(href);
      }
    }
  });

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
