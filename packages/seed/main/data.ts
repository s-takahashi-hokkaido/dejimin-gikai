/**
 * 札幌市議会版・開発用シードデータ
 *
 * ## 設計意図
 * - 本ファイルは **ローカル開発・動作確認用の fixture**。本番運用データではない。
 * - `pnpm db:reset` 経由で `clearAllData` → 全件再投入する破壊的シードなので、本番DBには流さない。
 * - とはいえ「ダミー」では UI 検証がしにくいため、定例会・会派・委員会は札幌市議会の実データを使用。
 * - 本番の運用フロー: 管理画面 (admin) で人手投入 or CSV import (`packages/seed/csv/`)。
 *   この data.ts を運用に組み込まない理由は (a) 会派は選挙で変動 (b) clearAllData が
 *   AI生成済みコンテンツ（インタビュー結果・要約等）を破壊するため。
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
type InterviewSessionInsert =
  Database["public"]["Tables"]["interview_sessions"]["Insert"];
type InterviewMessageInsert =
  Database["public"]["Tables"]["interview_messages"]["Insert"];
type InterviewReportInsert =
  Database["public"]["Tables"]["interview_report"]["Insert"];

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
  // --- Featured（トップページタブ） ---
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
  // --- 通常タグ ---
  {
    label: "交通・インフラ",
    description: "道路、橋梁、地下鉄・市電、上下水道など都市インフラに関する議案",
    featured_priority: null,
  },
  {
    label: "環境",
    description: "環境保全、廃棄物処理、脱炭素・省エネルギーに関する議案",
    featured_priority: null,
  },
  {
    label: "経済・産業",
    description: "中小企業支援、農業振興、雇用対策に関する議案",
    featured_priority: null,
  },
  {
    label: "観光・文化・スポーツ",
    description: "観光振興、文化施設、スポーツ施設に関する議案",
    featured_priority: null,
  },
  {
    label: "DX・行政改革",
    description: "ICT活用、行政手続きデジタル化、組織改編に関する議案",
    featured_priority: null,
  },
  {
    label: "税・使用料",
    description: "市税条例、各種施設使用料・手数料の改定に関する議案",
    featured_priority: null,
  },
  {
    label: "人権・市民生活",
    description: "男女共同参画、消費者保護、地域コミュニティに関する議案",
    featured_priority: null,
  },
  {
    label: "議会・選挙",
    description: "議員定数、政務活動費、選挙管理に関する議案",
    featured_priority: null,
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

// インタビューセッションを作成（5パターン × 20回 = 100件）
export function createInterviewSessions(
  interviewConfigId: string
): Omit<InterviewSessionInsert, "id" | "created_at" | "updated_at">[] {
  const now = new Date();
  const sessions: Omit<
    InterviewSessionInsert,
    "id" | "created_at" | "updated_at"
  >[] = [];

  for (let i = 0; i < 20; i++) {
    const baseOffset = i * 86400000 * 3;

    sessions.push({
      interview_config_id: interviewConfigId,
      user_id: `00000000-0000-0000-0000-${String(i * 5 + 1).padStart(12, "0")}`,
      started_at: new Date(now.getTime() - baseOffset - 3600000).toISOString(),
      completed_at: new Date(now.getTime() - baseOffset - 3000000).toISOString(),
    });

    sessions.push({
      interview_config_id: interviewConfigId,
      user_id: `00000000-0000-0000-0000-${String(i * 5 + 2).padStart(12, "0")}`,
      started_at: new Date(now.getTime() - baseOffset - 7200000).toISOString(),
      completed_at: new Date(now.getTime() - baseOffset - 6600000).toISOString(),
    });

    sessions.push({
      interview_config_id: interviewConfigId,
      user_id: `00000000-0000-0000-0000-${String(i * 5 + 3).padStart(12, "0")}`,
      started_at: new Date(now.getTime() - baseOffset - 10800000).toISOString(),
      completed_at: new Date(now.getTime() - baseOffset - 10200000).toISOString(),
    });

    sessions.push({
      interview_config_id: interviewConfigId,
      user_id: `00000000-0000-0000-0000-${String(i * 5 + 4).padStart(12, "0")}`,
      started_at: new Date(now.getTime() - baseOffset - 14400000).toISOString(),
      completed_at: new Date(now.getTime() - baseOffset - 13800000).toISOString(),
    });

    sessions.push({
      interview_config_id: interviewConfigId,
      user_id: `00000000-0000-0000-0000-${String(i * 5 + 5).padStart(12, "0")}`,
      started_at: new Date(now.getTime() - baseOffset - 1800000).toISOString(),
      completed_at: null,
    });
  }

  return sessions;
}

// インタビューメッセージを作成（5パターンをループ）
export function createInterviewMessages(
  sessionIds: string[]
): Omit<InterviewMessageInsert, "id" | "created_at">[] {
  const conversations = [
    [
      { role: "assistant" as const, content: "この議案に賛成ですか？反対ですか？" },
      { role: "user" as const, content: "賛成です" },
      { role: "assistant" as const, content: "その理由を教えてください。" },
      { role: "user" as const, content: "なぜなら賛成だからです。市民のためになると思います。" },
      { role: "assistant" as const, content: "ありがとうございました。ご意見を承りました。" },
    ],
    [
      { role: "assistant" as const, content: "この議案に賛成ですか？反対ですか？" },
      { role: "user" as const, content: "反対です" },
      { role: "assistant" as const, content: "その理由を教えてください。" },
      { role: "user" as const, content: "財源が不明確だと思います。" },
      { role: "assistant" as const, content: "ありがとうございました。ご意見を承りました。" },
    ],
    [
      { role: "assistant" as const, content: "この議案に賛成ですか？反対ですか？" },
      { role: "user" as const, content: "どちらでもないです" },
      { role: "assistant" as const, content: "その理由を教えてください。" },
      { role: "user" as const, content: "もっと情報が必要だと思います。" },
      { role: "assistant" as const, content: "ありがとうございました。ご意見を承りました。" },
    ],
    [
      { role: "assistant" as const, content: "この議案に賛成ですか？反対ですか？" },
      { role: "user" as const, content: "賛成です" },
      { role: "assistant" as const, content: "その理由を教えてください。" },
      { role: "user" as const, content: "良い議案だと思います。" },
      { role: "assistant" as const, content: "ありがとうございました。ご意見を承りました。" },
    ],
    [
      { role: "assistant" as const, content: "この議案に賛成ですか？反対ですか？" },
      { role: "user" as const, content: "うーん、ちょっと考えさせてください" },
    ],
  ];

  const messages: Omit<InterviewMessageInsert, "id" | "created_at">[] = [];

  sessionIds.forEach((sessionId, sessionIndex) => {
    const patternIndex = sessionIndex % 5;
    const conversation = conversations[patternIndex];
    conversation.forEach((msg) => {
      messages.push({ interview_session_id: sessionId, role: msg.role, content: msg.content });
    });
  });

  return messages;
}

// インタビューレポートを作成（パターン1,2,3のみ）
export function createInterviewReports(
  sessionIds: string[]
): Omit<InterviewReportInsert, "id" | "created_at" | "updated_at">[] {
  const reportTemplates = [
    {
      stance: "for" as const,
      summary: "この議案に賛成。市民のためになると考えている。",
      role: "general_citizen" as const,
      role_description: "議案の内容に賛同する市民",
      opinions: [{ title: "賛成理由", content: "市民のためになる" }],
    },
    {
      stance: "against" as const,
      summary: "財源の不明確さを理由に反対。",
      role: "work_related" as const,
      role_description: "財政面を懸念する市民",
      opinions: [{ title: "反対理由", content: "財源が不明確" }],
    },
    {
      stance: "neutral" as const,
      summary: "判断するにはより多くの情報が必要と考えている。",
      role: "subject_expert" as const,
      role_description: "慎重な判断を求める市民",
      opinions: [{ title: "態度保留理由", content: "情報不足" }],
    },
  ];

  const reports: Omit<InterviewReportInsert, "id" | "created_at" | "updated_at">[] = [];

  sessionIds.forEach((sessionId, index) => {
    const patternIndex = index % 5;
    if (patternIndex < 3) {
      const loopIndex = Math.floor(index / 5);
      reports.push({
        interview_session_id: sessionId,
        ...reportTemplates[patternIndex],
        is_public_by_user: loopIndex < 5,
      });
    }
  });

  return reports;
}

// デモ用の固定ID
export const DEMO_SESSION_ID = "00000000-0000-0000-0000-000000000001";
export const DEMO_REPORT_ID = "00000000-0000-0000-0000-000000000001";
export const DEMO_SESSION_ID_WORK = "00000000-0000-0000-0000-000000000002";
export const DEMO_SESSION_ID_DAILY = "00000000-0000-0000-0000-000000000003";
export const DEMO_SESSION_ID_CITIZEN = "00000000-0000-0000-0000-000000000004";
export const DEMO_REPORT_ID_WORK = "00000000-0000-0000-0000-000000000002";
export const DEMO_REPORT_ID_DAILY = "00000000-0000-0000-0000-000000000003";
export const DEMO_REPORT_ID_CITIZEN = "00000000-0000-0000-0000-000000000004";

export function createDemoSession(
  interviewConfigId: string
): InterviewSessionInsert {
  const now = new Date();
  return {
    id: DEMO_SESSION_ID,
    interview_config_id: interviewConfigId,
    user_id: "00000000-0000-0000-0000-000000000000",
    started_at: new Date(now.getTime() - 3600000).toISOString(),
    completed_at: new Date(now.getTime() - 3000000).toISOString(),
  };
}

export function createDemoMessages(): Omit<
  InterviewMessageInsert,
  "id" | "created_at"
>[] {
  return [
    {
      interview_session_id: DEMO_SESSION_ID,
      role: "assistant",
      content:
        "こんにちは！本日はインタビューにご協力いただきありがとうございます。\n\n札幌市議会で審議されている議案について、市民の皆さまのご意見をお聞かせください。この議案について、どのようにお考えですか？",
    },
    {
      interview_session_id: DEMO_SESSION_ID,
      role: "user",
      content: "市政のデジタル化や、ムダの削減を達成して欲しい",
    },
    {
      interview_session_id: DEMO_SESSION_ID,
      role: "assistant",
      content:
        "なるほど。市政のデジタル化を通じて、行政サービスの効率化と市民の利便性向上を期待されているということですね。とても重要な指摘だと思います。\n\n具体的に、札幌市のどのような行政手続きや窓口サービスがデジタル化されると良いとお考えですか？",
    },
    {
      interview_session_id: DEMO_SESSION_ID,
      role: "user",
      content:
        "市役所の窓口手続きのオンライン化や、行政文書のデジタル化が進むと市民にとって便利になると期待しています。",
    },
    {
      interview_session_id: DEMO_SESSION_ID,
      role: "assistant",
      content: "ありがとうございました。ご意見を承りました。",
    },
  ];
}

export function createDemoReport(): InterviewReportInsert {
  return {
    id: DEMO_REPORT_ID,
    interview_session_id: DEMO_SESSION_ID,
    stance: "neutral",
    summary: "期待と懸念両方がある",
    role: "subject_expert",
    role_description:
      "札幌市在住の会社員\n行政手続きの煩雑さを日常的に感じている",
    opinions: [
      {
        title: "市政のデジタル化や、ムダの削減を達成して欲しい",
        content:
          "市役所の窓口手続きのオンライン化や、行政文書のデジタル化が進むと市民にとって便利になると期待している。",
      },
    ],
    is_public_by_user: true,
  };
}

export function createAdditionalDemoSessions(
  interviewConfigId: string
): InterviewSessionInsert[] {
  const now = new Date();
  return [
    {
      id: DEMO_SESSION_ID_WORK,
      interview_config_id: interviewConfigId,
      user_id: "00000000-0000-0000-0000-000000000010",
      started_at: new Date(now.getTime() - 7200000).toISOString(),
      completed_at: new Date(now.getTime() - 6600000).toISOString(),
    },
    {
      id: DEMO_SESSION_ID_DAILY,
      interview_config_id: interviewConfigId,
      user_id: "00000000-0000-0000-0000-000000000011",
      started_at: new Date(now.getTime() - 10800000).toISOString(),
      completed_at: new Date(now.getTime() - 10200000).toISOString(),
    },
    {
      id: DEMO_SESSION_ID_CITIZEN,
      interview_config_id: interviewConfigId,
      user_id: "00000000-0000-0000-0000-000000000012",
      started_at: new Date(now.getTime() - 14400000).toISOString(),
      completed_at: new Date(now.getTime() - 10200000).toISOString(),
    },
  ];
}

export function createAdditionalDemoMessages(): Omit<
  InterviewMessageInsert,
  "id" | "created_at"
>[] {
  return [
    {
      interview_session_id: DEMO_SESSION_ID_WORK,
      role: "assistant",
      content:
        "こんにちは！本日はインタビューにご協力いただきありがとうございます。",
    },
    {
      interview_session_id: DEMO_SESSION_ID_WORK,
      role: "user",
      content: "子どもの医療費負担が大きいので、この議案には賛成です。",
    },
    {
      interview_session_id: DEMO_SESSION_ID_WORK,
      role: "assistant",
      content:
        "子育て世帯としてのお立場からのご意見ですね。具体的にどのような影響がありますか？",
    },
    {
      interview_session_id: DEMO_SESSION_ID_WORK,
      role: "user",
      content:
        "共働きで子ども2人を育てていますが、医療費の自己負担が家計を圧迫しています。助成拡充で少しでも負担が減れば助かります。",
    },
    {
      interview_session_id: DEMO_SESSION_ID_WORK,
      role: "assistant",
      content: "ありがとうございました。ご意見を承りました。",
    },
    {
      interview_session_id: DEMO_SESSION_ID_DAILY,
      role: "assistant",
      content:
        "こんにちは！本日はインタビューにご協力いただきありがとうございます。",
    },
    {
      interview_session_id: DEMO_SESSION_ID_DAILY,
      role: "user",
      content: "子どもが小さいので、医療費の負担が軽くなるのは嬉しいです。",
    },
    {
      interview_session_id: DEMO_SESSION_ID_DAILY,
      role: "assistant",
      content:
        "生活への影響が大きいとのことですね。どのような場面で医療費の負担を感じますか？",
    },
    {
      interview_session_id: DEMO_SESSION_ID_DAILY,
      role: "user",
      content:
        "風邪や怪我で小児科にかかることが多く、月に何回も通院することがあります。自己負担が積み重なると大変です。",
    },
    {
      interview_session_id: DEMO_SESSION_ID_DAILY,
      role: "assistant",
      content: "ありがとうございました。ご意見を承りました。",
    },
    {
      interview_session_id: DEMO_SESSION_ID_CITIZEN,
      role: "assistant",
      content:
        "こんにちは！本日はインタビューにご協力いただきありがとうございます。",
    },
    {
      interview_session_id: DEMO_SESSION_ID_CITIZEN,
      role: "user",
      content:
        "財源が気になりますが、子育て支援として医療費助成は必要だと思います。",
    },
    {
      interview_session_id: DEMO_SESSION_ID_CITIZEN,
      role: "assistant",
      content:
        "財源と子育て支援のバランスを考えていらっしゃるのですね。どのような点が気になりますか？",
    },
    {
      interview_session_id: DEMO_SESSION_ID_CITIZEN,
      role: "user",
      content:
        "他の行政サービスとのバランスも考えつつ、子育て世帯への支援として医療費助成は拡充すべきだと思います。",
    },
    {
      interview_session_id: DEMO_SESSION_ID_CITIZEN,
      role: "assistant",
      content: "ありがとうございました。ご意見を承りました。",
    },
  ];
}

export function createAdditionalDemoReports(): InterviewReportInsert[] {
  return [
    {
      id: DEMO_REPORT_ID_WORK,
      interview_session_id: DEMO_SESSION_ID_WORK,
      stance: "for",
      summary: "子育て世帯として医療費負担軽減のため賛成",
      role: "work_related",
      role_description:
        "札幌市在住の共働き世帯\n子ども2人\n医療費の負担を日常的に感じている",
      opinions: [
        {
          title: "子どもの医療費負担が大きい",
          content:
            "共働きで子ども2人を育てているが、医療費の自己負担が家計を圧迫している。助成拡充で負担が減れば助かる。",
        },
      ],
      is_public_by_user: true,
    },
    {
      id: DEMO_REPORT_ID_DAILY,
      interview_session_id: DEMO_SESSION_ID_DAILY,
      stance: "for",
      summary: "子育て中の保護者として医療費負担軽減を期待",
      role: "daily_life_affected",
      role_description:
        "札幌市在住の主婦\n小さい子ども2人の子育て中\n医療費の自己負担を日常的に感じている",
      opinions: [
        {
          title: "子どもの医療費負担が大きい",
          content:
            "風邪や怪我で小児科にかかることが多く、月に何回も通院する。自己負担が積み重なると家計に影響が大きい。",
        },
      ],
      is_public_by_user: true,
    },
    {
      id: DEMO_REPORT_ID_CITIZEN,
      interview_session_id: DEMO_SESSION_ID_CITIZEN,
      stance: "neutral",
      summary: "財源と子育て支援のバランスを考慮して判断",
      role: "general_citizen",
      role_description:
        "札幌市在住の会社員\n子育て支援に関心あり\n市の財政にも関心がある",
      opinions: [
        {
          title: "財源と子育て支援のバランス",
          content:
            "他の行政サービスとのバランスも考えつつ、子育て世帯への支援として医療費助成は拡充すべきと考える。",
        },
      ],
      is_public_by_user: true,
    },
  ];
}
