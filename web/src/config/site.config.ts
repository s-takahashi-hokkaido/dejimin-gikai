/**
 * サイト設定ファイル
 * Fork して別の地方議会向けに使用する場合はこのファイルを変更してください。
 * @see docs/20260520_1900_札幌市版FORK_GUIDELINES適応手順書.md
 */
export const siteConfig = {
  siteName: "デジ民議会",
  siteDescription:
    "札幌市議会で今どんな議案が検討されているか、わかりやすく伝えるプラットフォームです",
  cityName: "札幌市",
  councilName: "札幌市議会",
  keywords: [
    "デジ民議会",
    "議案",
    "札幌市",
    "市議会",
    "地方政治",
    "政策",
    "解説",
  ],
  councilBaseUrl: "https://www.city.sapporo.jp/gikai/",
  /** 議案・議決結果の一覧ページ */
  councilBillsDetailUrl:
    "https://www.city.sapporo.jp/gikai/html/giantouichiran.html",
  twitterHashtag: "デジ民議会", // # なし
  /**
   * OGP / SNS シェア用のデフォルト画像。
   * X・Facebook・LINE 等は OGP 画像に SVG を受け付けないため PNG を配信する。
   * デザインの原本は docs/assets/ogp.svg（変更時は 1200x630 の PNG に書き出す）。
   */
  ogImage: {
    path: "/ogp.png",
    width: 1200,
    height: 630,
  },
  externalLinks: {
    report: "https://forms.gle/PbZdpdRzTrsAuDST7",
    aboutNote: "",
  },
  /**
   * ページを管理する政党名（空文字列の場合は政党名を省略した汎用表現を使用）
   */
  managingParty: "" as string,
  /**
   * サービス運営者情報
   * 利用規約や問い合わせ先に使用します。
   */
  operator: {
    name: "s.takahashi" as string,
    contactUrl: "https://x.com/s_takahashi_cte" as string,
    /** 利用規約の準拠法・管轄裁判所（第一審の専属的合意管轄） */
    jurisdiction: "札幌地方裁判所" as string,
  },
  /**
   * AI機能の有効/無効設定
   * 本番環境のコスト管理のため、機能ごとにオン/オフを切り替えられます。
   */
  features: {
    /** AIチャット機能（議案への質問・テキスト選択からの質問）*/
    aiChat: true,
    /** AIインタビュー機能（議案当事者へのヒアリング）*/
    aiInterview: true,
  },
} as const;
