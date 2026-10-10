import type { GeneralQuestion, GeneralQuestionTopic } from "../types";

export type TopicEntry = {
  title: string;
  questionSummary: string;
  answerSummary: string;
  answererRole: string;
  answererName: string;
  topicCount: number;
  /** このブロックの先頭トピックが議員の topics 配列の何番目か（詳細ページのアンカー用） */
  topicIndex: number;
  questioner: {
    id: string;
    name: string;
    party: string | null;
  };
};

export type TopicGroup = {
  categoryLabel: string;
  iconName: string;
  entries: TopicEntry[];
};

const CATEGORY_MAP: Array<{
  label: string;
  iconName: string;
  keywords: string[];
}> = [
  {
    label: "子育て・教育",
    iconName: "Baby",
    keywords: [
      "保育",
      "子ども",
      "給食",
      "学校",
      "育児",
      "児童",
      "教育",
      "不登校",
      "教員",
      "修学",
      "進路",
      "学び",
      "義務教育",
      "外国人児童",
    ],
  },
  {
    label: "健康・医療",
    iconName: "Stethoscope",
    keywords: [
      "ワクチン",
      "医療",
      "コロナ",
      "健康",
      "HPV",
      "衛生",
      "後遺症",
      "肺炎",
      "接種",
      "病院",
    ],
  },
  {
    label: "防災・安全",
    iconName: "Shield",
    keywords: [
      "耐震",
      "避難",
      "防災",
      "減災",
      "災害",
      "安全",
      "火災",
      "発令",
      "警報",
      "注意報",
      "林野",
    ],
  },
  {
    label: "高齢者・福祉",
    iconName: "Heart",
    keywords: [
      "高齢者",
      "移動支援",
      "国民健康保険",
      "デジタルデバイド",
      "福祉",
      "介護",
      "障害",
      "老人",
      "孤立",
      "独居",
    ],
  },
  {
    label: "交通・まちづくり",
    iconName: "Building2",
    keywords: [
      "渋滞",
      "空港",
      "交通",
      "滑走路",
      "道路",
      "鉄道",
      "バス",
      "地下鉄",
      "まちづくり",
      "再開発",
      "無電柱",
      "橋梁",
      "駐輪",
      "渡船",
      "動く歩道",
      "住宅",
      "民泊",
    ],
  },
  {
    label: "環境・脱炭素",
    iconName: "Leaf",
    keywords: [
      "太陽光",
      "省エネ",
      "カーボン",
      "再生可能",
      "環境保全",
      "脱炭素",
      "ゼロカーボン",
      "温室効果",
      "海洋ごみ",
      "漂着",
      "植栽",
    ],
  },
  {
    label: "スポーツ・文化",
    iconName: "Trophy",
    keywords: [
      "スポーツ",
      "eスポーツ",
      "アスリート",
      "スタジアム",
      "博物館",
      "公民館",
      "城",
      "ドーム",
    ],
  },
  {
    label: "地域・国際交流",
    iconName: "Globe",
    keywords: [
      "漁港",
      "農業",
      "観光",
      "地域",
      "市営",
      "国際",
      "外国人",
      "多文化",
      "共生",
      "海業",
      "漁村",
      "動物",
      "愛護",
      "自治会",
      "町内会",
      "飼育",
      "農林水産",
      "アウトバウンド",
    ],
  },
];

export function assignCategory(topicTitle: string): {
  label: string;
  iconName: string;
} {
  for (const cat of CATEGORY_MAP) {
    if (cat.keywords.some((kw) => topicTitle.includes(kw))) {
      return { label: cat.label, iconName: cat.iconName };
    }
  }
  return { label: "その他", iconName: "Circle" };
}

function buildEntry(
  q: GeneralQuestion,
  topics: GeneralQuestionTopic[],
  topicIndex: number
): TopicEntry {
  const first = topics[0];
  // block_summary がある場合（複数トピック統合時にAI生成）はそれを優先
  // ない場合は最初のトピックのQ/Aを使う（最後のトピックはタイトルと不一致になるため）
  const useBlockSummary = !!first.block_summary;
  return {
    title: first.title,
    questionSummary: first.question_summary,
    answerSummary: first.block_summary ?? first.answer_summary,
    answererRole: useBlockSummary ? "" : first.answerer_role,
    answererName: useBlockSummary ? "" : first.answerer_name,
    topicCount: topics.length,
    topicIndex,
    questioner: {
      id: q.id,
      name: q.questioner_name,
      party: q.questioner_party,
    },
  };
}

export function buildTopicGroups(questions: GeneralQuestion[]): TopicGroup[] {
  // Group consecutive same-category topics per questioner into blocks.
  // This preserves natural Q&A blocks while still merging related sub-topics
  // (e.g. 10 fire-alarm exchanges → 1 card), without bundling unrelated themes
  // that happen to share a category (e.g. international exchange ≠ neighborhood assoc).
  const blocks: Array<{
    q: GeneralQuestion;
    topics: GeneralQuestionTopic[];
    iconName: string;
    categoryLabel: string;
    topicIndex: number;
  }> = [];

  for (const q of questions) {
    let currentBlock: (typeof blocks)[0] | null = null;

    q.topics.forEach((t, i) => {
      const { label, iconName } = assignCategory(t.title);

      if (currentBlock && currentBlock.categoryLabel === label) {
        currentBlock.topics.push(t);
      } else {
        currentBlock = {
          q,
          topics: [t],
          iconName,
          categoryLabel: label,
          topicIndex: i,
        };
        blocks.push(currentBlock);
      }
    });
  }

  const categoryMap = new Map<string, TopicGroup>();

  for (const { q, topics, iconName, categoryLabel, topicIndex } of blocks) {
    const entry = buildEntry(q, topics, topicIndex);
    const existing = categoryMap.get(categoryLabel);
    if (existing) {
      existing.entries.push(entry);
    } else {
      categoryMap.set(categoryLabel, {
        categoryLabel,
        iconName,
        entries: [entry],
      });
    }
  }

  const orderedLabels = [...CATEGORY_MAP.map((c) => c.label), "その他"].filter(
    (l) => categoryMap.has(l)
  );

  return orderedLabels.map((l) => categoryMap.get(l) as TopicGroup);
}
