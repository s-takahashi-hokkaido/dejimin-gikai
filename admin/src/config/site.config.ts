/**
 * サイト設定ファイル（Admin）
 * Fork して別の地方議会向けに使用する場合はこのファイルを変更してください。
 */
export const siteConfig = {
  siteName: "デジ民議会",
  cityName: "札幌市",
  councilName: "札幌市議会",
  councilBaseUrl: "https://www.city.sapporo.jp/gikai/",
  councilBillsDetailUrl:
    "https://www.city.sapporo.jp/gikai/html/giantouichiran.html",
  councilFactionExamples: "自由民主党、民主市民連合、公明党、日本共産党 等",
} as const;
