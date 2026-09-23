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
 * - 議案 (bills) はサンプルダミー（実在しない、UI検証用）
 */

import type { Database } from "@dejimin-gikai/supabase";

type BillInsert = Database["public"]["Tables"]["bills"]["Insert"];
type FactionStanceInsert =
  Database["public"]["Tables"]["faction_stances"]["Insert"];
type TagInsert = Database["public"]["Tables"]["tags"]["Insert"];
type BillsTagsInsert = Database["public"]["Tables"]["bills_tags"]["Insert"];
type CouncilSessionInsert =
  Database["public"]["Tables"]["council_sessions"]["Insert"];
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

// 定例会データ（札幌市議会）
export const councilSessions: CouncilSessionInsert[] = [
  {
    name: "令和8年 第2回定例会（5・6月）",
    slug: "r8-2",
    council_url: "https://www.city.sapporo.jp/gikai/html/kaiginittei.html",
    start_date: "2026-05-21",
    end_date: "2026-06-05",
    is_active: true,
  },
  {
    name: "令和8年 第1回定例会（2・3月）",
    slug: "r8-1",
    council_url: "https://www.city.sapporo.jp/gikai/html/giantouichiran0801t.html",
    start_date: "2026-02-12",
    end_date: "2026-03-26",
    is_active: false,
  },
];

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

// ※ サンプル議案（架空・UI検証用）。実在する札幌市議会の議案ではない。
// 第2回定例会（現在進行中）の議案 → currentSessionBillNames に列挙
// 第1回定例会（終了済み）の議案 → previousSessionBillNames に列挙
export const bills: BillInsert[] = [
  // ===== 第2回定例会（r8-2）=====
  {
    name: "令和8年度 一般会計補正予算（第1号）",
    bill_type: "bill",
    bill_number: "第1号",
    status: "in_committee",
    status_note: "財政市民委員会で審査中",
    published_at: "2026-05-23T09:00:00+09:00",
    publish_status: "published",
    is_featured: true,
  },
  {
    name: "札幌市情報化推進及びデジタル化促進条例",
    bill_type: "bill",
    bill_number: "第2号",
    status: "plenary_session",
    status_note: "本会議で審議中",
    published_at: "2026-05-23T09:00:00+09:00",
    publish_status: "published",
    is_featured: true,
  },
  {
    name: "札幌市子ども医療費助成条例の一部改正",
    bill_type: "bill",
    bill_number: "第3号",
    status: "in_committee",
    status_note: "厚生委員会で審査中",
    published_at: "2026-05-23T09:00:00+09:00",
    publish_status: "published",
    is_featured: true,
  },
  {
    name: "公共施設へのAED設置推進を求める決議",
    bill_type: "resolution",
    bill_number: "議決第1号",
    status: "approved",
    status_note: "本会議で可決（全会一致）",
    published_at: "2026-06-05T09:00:00+09:00",
    publish_status: "published",
    is_featured: false,
  },
  // ===== 第1回定例会（r8-1）=====
  {
    name: "令和7年度 一般会計決算の認定",
    bill_type: "bill_settlement",
    bill_number: "認定第1号",
    status: "approved",
    status_note: "本会議で認定",
    published_at: "2026-03-01T09:00:00+09:00",
    publish_status: "published",
    is_featured: false,
  },
  {
    name: "札幌市地域包括ケアシステム推進条例",
    bill_type: "bill",
    bill_number: "第1号",
    status: "approved",
    status_note: "本会議で可決",
    published_at: "2026-03-01T10:00:00+09:00",
    publish_status: "published",
    is_featured: true,
  },
  {
    name: "札幌市冬期路面管理条例の一部改正",
    bill_type: "bill",
    bill_number: "第2号",
    status: "rejected",
    status_note: "本会議で否決（賛成19、反対41）",
    published_at: "2026-03-01T09:00:00+09:00",
    publish_status: "published",
    is_featured: false,
  },
  {
    name: "札幌市学校給食費の無償化に関する条例",
    bill_type: "bill",
    bill_number: "第3号",
    status: "approved",
    status_note: "本会議で可決、令和8年4月から実施",
    published_at: "2026-03-01T09:00:00+09:00",
    publish_status: "published",
    is_featured: false,
  },
  {
    name: "札幌市観光振興条例の一部改正",
    bill_type: "bill",
    bill_number: "第4号",
    status: "rejected",
    status_note: "本会議で否決（賛成17、反対43）",
    published_at: "2026-03-01T10:00:00+09:00",
    publish_status: "published",
    is_featured: false,
  },
  {
    name: "札幌市市営住宅条例の一部改正",
    bill_type: "bill",
    bill_number: "第5号",
    status: "approved",
    status_note: "本会議で可決",
    published_at: "2026-03-01T09:00:00+09:00",
    publish_status: "published",
    is_featured: false,
  },
];

// セッション割り当て（run.ts で使用）
export const currentSessionBillNames = [
  "令和8年度 一般会計補正予算（第1号）",
  "札幌市情報化推進及びデジタル化促進条例",
  "札幌市子ども医療費助成条例の一部改正",
  "公共施設へのAED設置推進を求める決議",
];

export const previousSessionBillNames = [
  "令和7年度 一般会計決算の認定",
  "札幌市地域包括ケアシステム推進条例",
  "札幌市冬期路面管理条例の一部改正",
  "札幌市学校給食費の無償化に関する条例",
  "札幌市観光振興条例の一部改正",
  "札幌市市営住宅条例の一部改正",
];

// 委員会割り当て（run.ts で使用）
export const billCommitteeMap: Record<string, string> = {
  "令和8年度 一般会計補正予算（第1号）": "財政市民委員会",
  "札幌市情報化推進及びデジタル化促進条例": "総務委員会",
  "札幌市子ども医療費助成条例の一部改正": "厚生委員会",
  "公共施設へのAED設置推進を求める決議": "厚生委員会",
  "令和7年度 一般会計決算の認定": "財政市民委員会",
  "札幌市地域包括ケアシステム推進条例": "厚生委員会",
  "札幌市冬期路面管理条例の一部改正": "建設委員会",
  "札幌市学校給食費の無償化に関する条例": "文教委員会",
  "札幌市観光振興条例の一部改正": "経済観光委員会",
  "札幌市市営住宅条例の一部改正": "建設委員会",
};

// 議案とタグの関連付け
export function createBillsTags(
  insertedBills: { id: string; name: string }[],
  insertedTags: { id: string; label: string }[]
): Omit<BillsTagsInsert, "id" | "created_at">[] {
  const billTagMap: { [billName: string]: string[] } = {
    "令和8年度 一般会計補正予算（第1号）": ["財政・予算"],
    "札幌市情報化推進及びデジタル化促進条例": ["DX・行政改革"],
    "札幌市子ども医療費助成条例の一部改正": ["子育て・教育"],
    "公共施設へのAED設置推進を求める決議": ["福祉・医療"],
    "令和7年度 一般会計決算の認定": ["財政・予算"],
    "札幌市地域包括ケアシステム推進条例": ["福祉・医療"],
    "札幌市冬期路面管理条例の一部改正": ["雪対策・防災"],
    "札幌市学校給食費の無償化に関する条例": ["子育て・教育"],
    "札幌市観光振興条例の一部改正": ["観光・文化・スポーツ"],
    "札幌市市営住宅条例の一部改正": ["まちづくり・住宅"],
  };

  const billsTags: Omit<BillsTagsInsert, "id" | "created_at">[] = [];

  for (const bill of insertedBills) {
    const tagLabels = billTagMap[bill.name] || [];
    for (const tagLabel of tagLabels) {
      const tag = insertedTags.find((t) => t.label === tagLabel);
      if (tag) {
        billsTags.push({ bill_id: bill.id, tag_id: tag.id });
      }
    }
  }

  return billsTags;
}

// 会派見解データ（複数会派分）
type FactionStanceDef = {
  bill_name: string;
  faction_name: string;
  type: FactionStanceInsert["type"];
  comment: string;
};

const factionStanceDefs: FactionStanceDef[] = [
  // ===== 令和8年度 一般会計補正予算（第1号）=====
  {
    bill_name: "令和8年度 一般会計補正予算（第1号）",
    faction_name: "jimin-sapporo",
    type: "for",
    comment: `物価高騰・エネルギーコスト上昇への対応として、今回の補正予算は必要な措置です。

市施設の光熱費増嵩分の手当てと、降雪量増加に対応した除排雪費の増額は、市民生活と行政運営の安定に直結します。財政規律を維持しつつ、適切な補正措置として賛成します。`,
  },
  {
    bill_name: "令和8年度 一般会計補正予算（第1号）",
    faction_name: "minshu-shimin-sapporo",
    type: "conditional_for",
    comment: `補正予算の大枠には理解を示しますが、物価高騰対策として市民向けの直接支援がより手厚くあるべきです。

中小事業者・低所得世帯への支援策を拡充する修正を求めましたが反映されなかったため、条件付きの賛意にとどめます。`,
  },
  {
    bill_name: "令和8年度 一般会計補正予算（第1号）",
    faction_name: "komei-sapporo",
    type: "for",
    comment: `物価高騰から市民を守るための補正予算として、賛成します。

特に市営施設の利用料値上げを回避するための光熱費補填措置は、市民負担の軽減に直結します。今後も物価動向を注視し、機動的な財政対応を継続することを求めます。`,
  },
  {
    bill_name: "令和8年度 一般会計補正予算（第1号）",
    faction_name: "kyosan-sapporo",
    type: "against",
    comment: `市民への直接給付や福祉向け予算が不十分です。

物価高騰の影響を最も強く受けているのは低所得世帯・ひとり親家庭です。施設維持費の手当てにとどまらず、市民生活を直接支える給付措置を盛り込むべきであり、現行案には反対します。`,
  },
  {
    bill_name: "令和8年度 一般会計補正予算（第1号）",
    faction_name: "mirai-sapporo",
    type: "conditional_for",
    comment: `除排雪費の増額と施設光熱費の補填は必要な措置として理解します。

一方、補正予算の編成過程における情報公開と議会への早期報告を強く求めます。今後は当初予算の段階で物価変動リスクを織り込んだ予算設計を行うよう求め、条件付きで賛成します。`,
  },

  // ===== 札幌市情報化推進及びデジタル化促進条例 =====
  {
    bill_name: "札幌市情報化推進及びデジタル化促進条例",
    faction_name: "jimin-sapporo",
    type: "for",
    comment: `行政のデジタル化は市民サービスの質向上と行政コスト削減の両立を可能にします。

マイナンバーカードの活用拡大、窓口手続きのオンライン化、AI活用による業務効率化は、札幌市が将来にわたって持続可能な行政運営を維持するために不可欠な投資です。`,
  },
  {
    bill_name: "札幌市情報化推進及びデジタル化促進条例",
    faction_name: "minshu-shimin-sapporo",
    type: "conditional_for",
    comment: `デジタル化の推進には賛成しますが、デジタルデバイドへの対応が不十分です。

高齢者・障がい者・外国籍市民がデジタルサービスから取り残されないよう、アナログ手続きとの並走期間の確保と、利用支援体制の整備を条件として求めます。`,
  },
  {
    bill_name: "札幌市情報化推進及びデジタル化促進条例",
    faction_name: "komei-sapporo",
    type: "for",
    comment: `行政DXの推進は、市民の利便性向上と行政の効率化を同時に実現するものです。

特に子育て・介護分野の手続きオンライン化により、忙しい子育て世帯や遠隔地の高齢者世帯の負担が大幅に軽減されます。個人情報保護体制の強化とあわせて進めることを確認し、賛成します。`,
  },
  {
    bill_name: "札幌市情報化推進及びデジタル化促進条例",
    faction_name: "kyosan-sapporo",
    type: "neutral",
    comment: `デジタル化の方向性には一定の理解を示しますが、懸念点があります。

個人情報の大規模な電子化・集中管理はプライバシーリスクを高めます。また、民間IT企業への依存度が高まることで、行政の自律性が損なわれる恐れがあります。セキュリティ基準と情報管理の透明性の確保を強く求めます。`,
  },
  {
    bill_name: "札幌市情報化推進及びデジタル化促進条例",
    faction_name: "mirai-sapporo",
    type: "for",
    comment: `デジタル化は次世代の札幌市をつくる重要な基盤整備です。

行政手続きのワンストップ化とデータの利活用により、市民サービスの大幅な改善が期待できます。一方でデジタルデバイド対策・セキュリティ対策・費用対効果の検証を継続的に実施することを求め、賛成します。`,
  },

  // ===== 札幌市子ども医療費助成条例の一部改正 =====
  {
    bill_name: "札幌市子ども医療費助成条例の一部改正",
    faction_name: "jimin-sapporo",
    type: "conditional_for",
    comment: `子育て支援の充実は重要な政策です。初診時の一部負担金撤廃は、受診控えの解消につながります。

ただし、年間4.5億円の追加財政負担の中長期的な影響と、コンビニ受診増加への対応策を明確にした上で進めるべきです。これらの懸念が解消されることを条件として、条例改正に賛意を示します。`,
  },
  {
    bill_name: "札幌市子ども医療費助成条例の一部改正",
    faction_name: "minshu-shimin-sapporo",
    type: "for",
    comment: `子どもの医療費助成の完全無償化は、子育て世代の経済的負担を根本から解消する重要な施策です。

初診時580円という金額は小さく見えますが、複数の子どもを持つ世帯では積み重なると大きな負担になります。道内主要自治体との制度水準均衡の観点からも、早期実施を強く支持します。`,
  },
  {
    bill_name: "札幌市子ども医療費助成条例の一部改正",
    faction_name: "komei-sapporo",
    type: "for",
    comment: `子どもの医療費の完全無償化は、公明党が長年推進してきた子育て支援政策の重要な柱です。

受診のたびに発生する一部負担金を撤廃することで、すべての子どもが必要な時に必要な医療を受けられる環境が整います。財源確保の工夫と適正受診の啓発を並行して進めることを確認し、賛成します。`,
  },
  {
    bill_name: "札幌市子ども医療費助成条例の一部改正",
    faction_name: "kyosan-sapporo",
    type: "for",
    comment: `子どもの医療費無償化は、すべての子どもに等しく医療を保障する観点から当然の施策です。

今回の初診時負担撤廃は一歩前進ですが、対象年齢のさらなる拡大（大学生世代まで）と国・道による財源保障の実現に向けた取り組みの継続を求めます。`,
  },
  {
    bill_name: "札幌市子ども医療費助成条例の一部改正",
    faction_name: "mirai-sapporo",
    type: "for",
    comment: `子どもの医療費助成の拡充は、子育て世代の経済的負担を軽減する重要な施策です。

札幌市の子育て環境をより良くし、安心して子育てできるまちづくりに貢献すると考えます。`,
  },

  // ===== 公共施設へのAED設置推進を求める決議 =====
  {
    bill_name: "公共施設へのAED設置推進を求める決議",
    faction_name: "jimin-sapporo",
    type: "for",
    comment: `AEDの普及促進は命を救う取り組みとして超党派で推進すべきです。

公共施設への設置拡大とあわせて、市民向けの救急救命講習の充実も求め、賛成します。`,
  },
  {
    bill_name: "公共施設へのAED設置推進を求める決議",
    faction_name: "minshu-shimin-sapporo",
    type: "for",
    comment: `救急救命体制の充実に向け、AED設置の推進は当然の措置です。

設置後の定期点検・管理体制の確保と、使用方法の市民周知を徹底するよう求め、賛成します。`,
  },
  {
    bill_name: "公共施設へのAED設置推進を求める決議",
    faction_name: "komei-sapporo",
    type: "for",
    comment: `AEDの普及拡大は公明党が全国各地で推進してきた生命を守る政策です。

すべての公共施設に設置が完了するよう、スケジュールと予算確保を着実に進めることを求めます。`,
  },
  {
    bill_name: "公共施設へのAED設置推進を求める決議",
    faction_name: "kyosan-sapporo",
    type: "for",
    comment: `AED設置の推進は生命を守る観点から全会一致で支持します。

学校・公民館・地下鉄駅などの優先設置箇所の整備を速やかに進めることを求め、賛成します。`,
  },
  {
    bill_name: "公共施設へのAED設置推進を求める決議",
    faction_name: "mirai-sapporo",
    type: "for",
    comment: `市民の命を守るインフラとして、AEDの普及は欠かせません。

民間施設への設置促進や夜間・休日の管理体制整備も視野に入れた取り組みを求め、賛成します。`,
  },

  // ===== 令和7年度 一般会計決算の認定 =====
  {
    bill_name: "令和7年度 一般会計決算の認定",
    faction_name: "jimin-sapporo",
    type: "for",
    comment: `令和7年度は物価高騰・エネルギーコスト上昇という困難な環境のもと、財政健全化目標を維持しつつ市民サービスを維持できた一年でした。

財政調整基金の適切な活用と歳出管理を評価し、決算認定に賛成します。`,
  },
  {
    bill_name: "令和7年度 一般会計決算の認定",
    faction_name: "minshu-shimin-sapporo",
    type: "for",
    comment: `決算全体として財政管理は適切でしたが、福祉・子育て分野の執行残が目立ちます。

予算を積んでも使い切れなかった事業の原因分析と改善策を次年度予算に反映するよう強く求め、認定します。`,
  },
  {
    bill_name: "令和7年度 一般会計決算の認定",
    faction_name: "komei-sapporo",
    type: "for",
    comment: `子育て支援・高齢者福祉・防災対策の各事業が着実に執行されたことを評価します。

今後は複数年度の財政見通しを市民にわかりやすく示すよう求め、決算認定に賛成します。`,
  },
  {
    bill_name: "令和7年度 一般会計決算の認定",
    faction_name: "kyosan-sapporo",
    type: "against",
    comment: `大型公共事業への過大な支出と、市民生活直接支援の予算削減が令和7年度も続きました。

財政健全化の名のもとに市民サービスを切り捨てる姿勢は認められないため、決算認定には反対します。`,
  },
  {
    bill_name: "令和7年度 一般会計決算の認定",
    faction_name: "mirai-sapporo",
    type: "for",
    comment: `令和7年度の予算執行は概ね適正でしたが、事業の優先順位と費用対効果について改善の余地があります。

特にDX関連事業の執行状況と効果測定の強化を求め、決算認定に賛成します。`,
  },

  // ===== 札幌市地域包括ケアシステム推進条例 =====
  {
    bill_name: "札幌市地域包括ケアシステム推進条例",
    faction_name: "jimin-sapporo",
    type: "for",
    comment: `超高齢化が急速に進む札幌市において、地域包括ケアの制度基盤整備は急務です。

10区に推進会議の設置を義務化し、医療・介護・地域が連携する体制を条例で担保する本案は、将来を見据えた重要な条例整備と評価し、賛成します。`,
  },
  {
    bill_name: "札幌市地域包括ケアシステム推進条例",
    faction_name: "minshu-shimin-sapporo",
    type: "for",
    comment: `高齢化率30%を超えた札幌市にとって、地域包括ケアシステムの推進は最重要課題のひとつです。

雪国・豪雪地域特有の冬期閉じこもり対策と、一人暮らし高齢者の孤立予防に特化した取り組みを条例に位置付けた点を評価し、賛成します。`,
  },
  {
    bill_name: "札幌市地域包括ケアシステム推進条例",
    faction_name: "komei-sapporo",
    type: "for",
    comment: `高齢化が進む中、地域包括ケアシステムの推進は札幌市にとって重要な課題です。

医療・介護・予防・住まい・生活支援を一体的に提供する体制の整備は、市民の安心につながります。`,
  },
  {
    bill_name: "札幌市地域包括ケアシステム推進条例",
    faction_name: "kyosan-sapporo",
    type: "for",
    comment: `地域包括ケアの整備は、高齢者が住み慣れた地域で尊厳ある生活を続けるための基盤です。

条例制定を機に、介護人材の確保・処遇改善と在宅サービスの充実に向けた予算の重点配分を強く求め、賛成します。`,
  },
  {
    bill_name: "札幌市地域包括ケアシステム推進条例",
    faction_name: "mirai-sapporo",
    type: "for",
    comment: `高齢化が進む中、地域包括ケアシステムの推進は札幌市にとって重要な課題です。

医療・介護・予防・住まい・生活支援を一体的に提供する体制の整備は、市民の安心につながります。`,
  },

  // ===== 札幌市冬期路面管理条例の一部改正 =====
  {
    bill_name: "札幌市冬期路面管理条例の一部改正",
    faction_name: "jimin-sapporo",
    type: "for",
    comment: `限られた除排雪予算の重点配分と地域協働の推進は、持続可能な冬期路面管理に向けた合理的な方向性です。

モデル実施を経て全市展開とする段階的アプローチを選択しなかった点は惜しまれますが、制度の基本的な方向性を支持し、賛成します。`,
  },
  {
    bill_name: "札幌市冬期路面管理条例の一部改正",
    faction_name: "minshu-shimin-sapporo",
    type: "against",
    comment: `町内会への義務化と補助率引き下げは、高齢化・担い手不足が深刻な地域コミュニティに過大な負担を強います。

生活道路の排雪を住民協力に依存する設計は、実態に即していません。現行の公的除排雪サービスの維持・強化こそ優先すべきとして、反対します。`,
  },
  {
    bill_name: "札幌市冬期路面管理条例の一部改正",
    faction_name: "komei-sapporo",
    type: "against",
    comment: `冬期路面管理は市民の安全・安心に直結する基本的な行政サービスです。

パートナーシップ排雪の補助率引き下げにより、参加世帯の負担増と制度からの離脱が懸念されます。まずは現行制度の改善・充実を図るべきとして、反対します。`,
  },
  {
    bill_name: "札幌市冬期路面管理条例の一部改正",
    faction_name: "kyosan-sapporo",
    type: "against",
    comment: `除排雪は市の基本的な公共サービスです。その責任を町内会・住民に転嫁する本改正案には、断固反対します。

高齢者・障がい者が多く住む住宅地ほど自力での雪対応が困難であり、行政の役割放棄は許されません。`,
  },
  {
    bill_name: "札幌市冬期路面管理条例の一部改正",
    faction_name: "mirai-sapporo",
    type: "against",
    comment: `冬期除排雪は市民の生活基盤を守る行政サービスです。

この条例改正により、優先路線の見直しと地域協働による排雪体制の強化が期待できますが、高齢者世帯の安全な外出保障の観点から、補助率引き下げには懸念があります。`,
  },

  // ===== 札幌市学校給食費の無償化に関する条例 =====
  {
    bill_name: "札幌市学校給食費の無償化に関する条例",
    faction_name: "jimin-sapporo",
    type: "conditional_for",
    comment: `学校給食費の無償化は子育て支援として意義ある施策です。段階導入の方針は財政負担を分散させる合理的な設計です。

一方、完成形での年間約65億円という恒常的支出増が長期財政計画に与える影響を精査するとともに、北海道産食材比率70%の達成に向けた具体策の提示を求め、条件付きで賛成します。`,
  },
  {
    bill_name: "札幌市学校給食費の無償化に関する条例",
    faction_name: "minshu-shimin-sapporo",
    type: "for",
    comment: `学校給食費の無償化は、子育て世代への強力な経済支援であり、教育の実質的な無償化を前進させるものです。

小中2人世帯で年間11万円の軽減効果は非常に大きく、食育推進と道産食材活用による地域経済への波及も期待できます。`,
  },
  {
    bill_name: "札幌市学校給食費の無償化に関する条例",
    faction_name: "komei-sapporo",
    type: "for",
    comment: `学校給食の無償化は、公明党が推進してきた子育て支援策と完全に一致する施策です。

所得制限なしの全員対象とすることで、所得確認の事務コスト削減と普遍的支援の両立が図られます。北海道産食材比率70%の規定も食育推進として高く評価します。`,
  },
  {
    bill_name: "札幌市学校給食費の無償化に関する条例",
    faction_name: "kyosan-sapporo",
    type: "for",
    comment: `学校給食の無償化は全ての子どもに等しい食と教育機会を保障する重要な政策です。

北海道産食材比率70%規定は道内一次産業の振興にも貢献します。今後は中学校への拡大と並行して、給食の質向上・アレルギー対応強化にも取り組むよう求め、賛成します。`,
  },
  {
    bill_name: "札幌市学校給食費の無償化に関する条例",
    faction_name: "mirai-sapporo",
    type: "for",
    comment: `学校給食の無償化は、子育て支援と教育の充実を同時に実現する重要な政策です。

全ての子どもが質の高い食事を平等に受けられることは、健康格差の解消にもつながります。北海道産食材を活用した食育の推進も期待できます。`,
  },

  // ===== 札幌市観光振興条例の一部改正 =====
  {
    bill_name: "札幌市観光振興条例の一部改正",
    faction_name: "jimin-sapporo",
    type: "for",
    comment: `民泊の適正管理と住民生活の保護は、観光振興の持続可能性を高めるために必要な規制整備です。

繁忙期の住宅地における宿泊営業の適正化は、地域住民の生活環境を守りながら観光の質を高めるものとして賛成します。`,
  },
  {
    bill_name: "札幌市観光振興条例の一部改正",
    faction_name: "minshu-shimin-sapporo",
    type: "against",
    comment: `観光振興を掲げる条例で観光受入を制限するのは矛盾です。

インバウンド回復期において宿泊キャパシティを絞ることは経済的損失が大きく、健全な民泊運営者まで一律規制する本案には反対します。`,
  },
  {
    bill_name: "札幌市観光振興条例の一部改正",
    faction_name: "komei-sapporo",
    type: "against",
    comment: `観光振興は重要ですが、現行条例の運用改善で対応できる部分も多いと考えます。

条例改正よりも先に、既存の観光資源（雪まつり・大通公園など）の磨き上げや、市民生活と観光の両立に注力すべきです。`,
  },
  {
    bill_name: "札幌市観光振興条例の一部改正",
    faction_name: "kyosan-sapporo",
    type: "against",
    comment: `民泊規制の方向性には一定の理解を示しますが、住宅宿泊事業法（国の上位法）との整合性に問題があります。

繁忙期60日制限は事実上の営業停止であり、雇用と地域経済への影響を十分に考慮していません。反対します。`,
  },
  {
    bill_name: "札幌市観光振興条例の一部改正",
    faction_name: "mirai-sapporo",
    type: "against",
    comment: `観光振興は重要ですが、現行条例の運用改善で対応できる部分も多いと考えます。

条例改正よりも先に、既存の観光資源（雪まつり・大通公園など）の磨き上げや、市民生活と観光の両立に注力すべきです。`,
  },

  // ===== 札幌市市営住宅条例の一部改正 =====
  {
    bill_name: "札幌市市営住宅条例の一部改正",
    faction_name: "jimin-sapporo",
    type: "for",
    comment: `老朽化した市営住宅の建て替えに伴う条例整備として、適切な改正内容です。

入居要件の見直しと使用料算定方法の改善により、真に支援が必要な低所得世帯が市営住宅に入居しやすくなることを期待し、賛成します。`,
  },
  {
    bill_name: "札幌市市営住宅条例の一部改正",
    faction_name: "minshu-shimin-sapporo",
    type: "for",
    comment: `市営住宅の適正管理と入居基準の見直しは、住宅セーフティネットの充実につながります。

単身高齢者・障がい者・ひとり親家庭が入居しやすい基準となっているか確認し、賛成します。`,
  },
  {
    bill_name: "札幌市市営住宅条例の一部改正",
    faction_name: "komei-sapporo",
    type: "for",
    comment: `住宅に困窮する市民への支援として、市営住宅の整備・管理の適正化は重要な施策です。

バリアフリー化の推進と、入居申込みのオンライン化も併せて検討するよう求め、賛成します。`,
  },
  {
    bill_name: "札幌市市営住宅条例の一部改正",
    faction_name: "mirai-sapporo",
    type: "for",
    comment: `市営住宅は低所得者・高齢者・障がい者の住まいを守るセーフティネットです。

今回の条例改正が入居者の生活の安定に寄与するものであることを確認し、賛成します。また今後の建て替え計画の着実な実施を求めます。`,
  },
];

export function createAllFactionStances(
  insertedBills: { id: string; name: string }[],
  insertedFactions: { id: string; name: string }[]
): FactionStanceInsert[] {
  const stances: FactionStanceInsert[] = [];
  for (const def of factionStanceDefs) {
    const bill = insertedBills.find((b) => b.name === def.bill_name);
    const faction = insertedFactions.find((f) => f.name === def.faction_name);
    if (!bill || !faction) continue;
    stances.push({
      bill_id: bill.id,
      faction_id: faction.id,
      type: def.type,
      comment: def.comment,
    });
  }
  return stances;
}

// インタビュー設定を作成（子ども医療費議案用）
export function createInterviewConfig(
  insertedBills: { id: string; name: string }[]
): Omit<InterviewConfigInsert, "id" | "created_at" | "updated_at"> | null {
  const targetBill = insertedBills.find(
    (b) => b.name === "札幌市子ども医療費助成条例の一部改正"
  );
  if (!targetBill) return null;

  return {
    bill_id: targetBill.id,
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
