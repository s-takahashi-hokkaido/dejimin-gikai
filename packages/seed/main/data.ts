/**
 * 札幌市議会版・開発用シードデータ
 *
 * ## 設計意図
 * - `factions` / `committees` / `tags`（会派・委員会・タグ）は **本番でも使うマスタ**。
 *   `pnpm seed:master`（`packages/seed/master/run.ts`）が本番 DB にそのまま入れるので、
 *   この3つには動作確認用のダミー行を足さないこと（足すと次の `pnpm seed:master` で本番に入る）。
 * - インタビュー設定（`createInterviewConfig` / `createInterviewQuestions`）は **ローカル開発・動作確認用の fixture**。本番運用データではない。
 *   架空の市民インタビュー（セッション・メッセージ・レポート）は 2026-09-30 に削除した。
 *   レポート画面を見たい時は、ローカルで実際にインタビューを1本回すか、管理画面から作る。
 * - `pnpm db:reset` 経由で `clearAllData` → 全件再投入する破壊的シードなので、本番DBには流さない。
 * - とはいえ「ダミー」では UI 検証がしにくいため、定例会・会派・委員会は札幌市議会の実データを使用。
 * - 本番の運用フロー: マスタは `pnpm seed:master`、議案等は管理画面 (admin) で人手投入 or
 *   CSV import (`packages/seed/csv/`)。`pnpm seed` 自体を運用に組み込まない理由は
 *   clearAllData が AI 生成済みコンテンツ（インタビュー結果・要約等）を破壊するため。
 *   議案は `pnpm seed:bills`（`packages/seed/bills/`）で冪等に投入できる。
 *
 * ## メンテナンス
 * - 統一地方選後・会派異動時に手で更新する（自動同期はしない）
 * - 出典:
 *   - 会派: https://www.city.sapporo.jp/gikai/meibo/meibo-kaiha.html
 *   - 常任委員会: https://www.city.sapporo.jp/gikai/meibo/meibo-iinkai.html
 *   - 定例会日程: https://www.city.sapporo.jp/gikai/html/kaiginittei.html
 * - 定例会・議案・解説・付託委員会・会派賛否は `sapporo-bills/` の実データ（令和8年第1回〜第3回）
 */

import type { Database } from "@dejimin-gikai/supabase";

type TagInsert = Database["public"]["Tables"]["tags"]["Insert"];
type FactionInsert = Database["public"]["Tables"]["factions"]["Insert"];
type CommitteeInsert = Database["public"]["Tables"]["committees"]["Insert"];
type InterviewConfigInsert =
  Database["public"]["Tables"]["interview_configs"]["Insert"];
type InterviewQuestionInsert =
  Database["public"]["Tables"]["interview_questions"]["Insert"];

// 会派データ（札幌市議会 2026年4月時点・議席数順）
export const factions: FactionInsert[] = [
  {
    name: "jimin-sapporo",
    display_name: "自由民主党",
    sort_order: 1,
    is_active: true,
  },
  {
    name: "minshu-shimin-sapporo",
    display_name: "民主市民連合",
    sort_order: 2,
    is_active: true,
  },
  {
    name: "komei-sapporo",
    display_name: "公明党",
    sort_order: 3,
    is_active: true,
  },
  {
    name: "kyosan-sapporo",
    display_name: "日本共産党",
    sort_order: 4,
    is_active: true,
  },
  {
    name: "sakamoto-arai-sapporo",
    display_name: "坂元・荒井",
    sort_order: 5,
    is_active: true,
  },
  {
    name: "yamaguchi-kazusa-sapporo",
    display_name: "山口かずさ",
    sort_order: 6,
    is_active: true,
  },
  {
    name: "mirai-sapporo",
    display_name: "未来さっぽろ",
    sort_order: 7,
    is_active: true,
  },
  {
    name: "kenko-sapporo",
    display_name: "健康さっぽろ",
    sort_order: 8,
    is_active: true,
  },
  {
    name: "daichi-sapporo",
    display_name: "大地さっぽろ",
    sort_order: 9,
    is_active: true,
  },
  {
    name: "shimin-network-sapporo",
    display_name: "市民ネットワーク北海道",
    sort_order: 10,
    is_active: true,
  },
  {
    name: "ishin-sapporo",
    display_name: "日本維新の会",
    sort_order: 11,
    is_active: true,
  },
];

// 委員会データ（札幌市議会）
// 出典: https://www.city.sapporo.jp/gikai/meibo/meibo-iinkai.html
export const committees: CommitteeInsert[] = [
  // 常任委員会
  {
    name: "総務委員会",
    committee_type: "standing",
    description: "一般行政事務、危機管理、選挙、人事などについての審査",
    sort_order: 1,
    is_active: true,
  },
  {
    name: "財政市民委員会",
    committee_type: "standing",
    description: "財政、税務、市民生活、男女共同参画などについての審査",
    sort_order: 2,
    is_active: true,
  },
  {
    name: "文教委員会",
    committee_type: "standing",
    description: "教育、学校、文化、子ども・子育てなどについての審査",
    sort_order: 3,
    is_active: true,
  },
  {
    name: "厚生委員会",
    committee_type: "standing",
    description: "保健、医療、福祉、高齢者・障がい者支援などについての審査",
    sort_order: 4,
    is_active: true,
  },
  {
    name: "建設委員会",
    committee_type: "standing",
    description: "道路、河川、都市計画、住宅、雪対策などについての審査",
    sort_order: 5,
    is_active: true,
  },
  {
    name: "経済観光委員会",
    committee_type: "standing",
    description: "産業、観光、農業、商工業、雇用などについての審査",
    sort_order: 6,
    is_active: true,
  },
  // 議会運営委員会
  {
    name: "議会運営委員会",
    committee_type: "parliamentary",
    description: "議会の運営に関する事項についての審査",
    sort_order: 7,
    is_active: true,
  },
  // 調査特別委員会
  {
    name: "大都市税財政制度・DX推進調査特別委員会",
    committee_type: "special",
    description: "大都市税財政制度及びDX推進に関する調査",
    sort_order: 8,
    is_active: true,
  },
  {
    name: "総合交通政策調査特別委員会",
    committee_type: "special",
    description: "総合的な交通政策に関する調査",
    sort_order: 9,
    is_active: true,
  },
  {
    name: "新たな都心空間調査特別委員会",
    committee_type: "special",
    description: "新たな都心空間の整備に関する調査",
    sort_order: 10,
    is_active: true,
  },
  // 予算特別委員会（第1回定例会で設置。当初予算と関連条例は第一部・第二部に分けて付託される）
  {
    name: "第一部予算特別委員会",
    committee_type: "special",
    description: "当初予算の審査（第1回定例会で設置）",
    sort_order: 11,
    is_active: true,
  },
  {
    name: "第二部予算特別委員会",
    committee_type: "special",
    description: "当初予算の審査（第1回定例会で設置）",
    sort_order: 12,
    is_active: true,
  },
  // 決算特別委員会（第3回定例会で設置。各会計の決算は第一部・第二部の両方、企業会計の決算は第二部に付託される）
  {
    name: "第一部決算特別委員会",
    committee_type: "special",
    description: "前年度決算の審査（第3回定例会で設置）",
    sort_order: 13,
    is_active: true,
  },
  {
    name: "第二部決算特別委員会",
    committee_type: "special",
    description: "前年度決算の審査（第3回定例会で設置）",
    sort_order: 14,
    is_active: true,
  },
];

// タグデータ
export const tags: TagInsert[] = [
  // 全タグをトップページに表示する（featured_priority の昇順）
  {
    label: "財政・予算",
    description: "補正予算、基金設置・廃止、債務負担行為など財政全般に関する議案",
    featured_priority: 1,
  },
  {
    label: "子育て・教育",
    description: "保育所、学校教育、子ども医療費助成など子育て・教育に関する議案",
    featured_priority: 2,
  },
  {
    label: "福祉・医療",
    description: "介護、障がい者支援、保健・医療など福祉医療に関する議案",
    featured_priority: 3,
  },
  {
    label: "まちづくり・住宅",
    description: "都市計画、市営住宅、土地利用など市街地整備に関する議案",
    featured_priority: 4,
  },
  {
    label: "雪対策・防災",
    description: "除雪、冬期路面管理、防災・危機管理に関する議案",
    featured_priority: 5,
  },
  {
    label: "交通・インフラ",
    description: "道路、橋梁、地下鉄・市電、上下水道など都市インフラに関する議案",
    featured_priority: 6,
  },
  {
    label: "環境",
    description: "環境保全、廃棄物処理、脱炭素・省エネルギーに関する議案",
    featured_priority: 7,
  },
  {
    label: "経済・産業",
    description: "中小企業支援、農業振興、雇用対策に関する議案",
    featured_priority: 8,
  },
  {
    label: "観光・文化・スポーツ",
    description: "観光振興、文化施設、スポーツ施設に関する議案",
    featured_priority: 9,
  },
  {
    label: "DX・行政改革",
    description: "ICT活用、行政手続きデジタル化、組織改編に関する議案",
    featured_priority: 10,
  },
  {
    label: "税・使用料",
    description: "市税条例、各種施設使用料・手数料の改定に関する議案",
    featured_priority: 11,
  },
  {
    label: "人権・市民生活",
    description: "男女共同参画、消費者保護、地域コミュニティに関する議案",
    featured_priority: 12,
  },
  {
    label: "議会・選挙",
    description: "議員定数、政務活動費、選挙管理に関する議案",
    featured_priority: 13,
  },
];

// インタビュー設定を作成（run.ts で令和8年第3回定例会 議案第11号「子ども医療費助成条例の一部改正」を指定）
export function createInterviewConfig(
  billId: string
): Omit<InterviewConfigInsert, "id" | "created_at" | "updated_at"> {
  return {
    bill_id: billId,
    name: "デフォルト設定",
    status: "public",
    themes: ["賛否", "理由"],
    knowledge_source: `この議案についてあなたの意見を聞かせてください。`,
  };
}

// インタビュー質問を作成
export function createInterviewQuestions(
  interviewConfigId: string
): Omit<InterviewQuestionInsert, "id" | "created_at" | "updated_at">[] {
  return [
    {
      interview_config_id: interviewConfigId,
      question: "この議案に賛成ですか？反対ですか？",
      follow_up_guide: "ユーザーの立場を明確にしてください。",
      quick_replies: ["賛成", "反対", "どちらでもない"],
      question_order: 1,
    },
    {
      interview_config_id: interviewConfigId,
      question: "その理由を教えてください。",
      follow_up_guide: "具体的な理由を引き出してください。",
      quick_replies: null,
      question_order: 2,
    },
  ];
}
