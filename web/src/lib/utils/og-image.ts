import { siteConfig } from "@/config/site.config";

/**
 * デフォルト OGP 画像の絶対 URL を返す。
 * SNS のクローラーは相対パスを解決しないため、必ず絶対 URL で渡す。
 */
export function resolveDefaultOgImageUrl(baseUrl: string): string {
  return new URL(siteConfig.ogImage.path, baseUrl).toString();
}
