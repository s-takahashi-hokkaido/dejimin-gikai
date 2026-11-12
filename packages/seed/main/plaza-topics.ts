/**
 * AIインタビュー広場の開発用 seed（議題の作成者のアカウントと議題）
 *
 * - **ローカル開発・動作確認用の fixture**。本番運用データではない（`pnpm seed` は本番に流さない）
 * - 議題を出せるのは議員と候補者だけ（K3）。`supabase/seed.sql` の admin@example.com は運営者なので、
 *   作成者になるアカウントをここで作る。人名はすべて架空のサンプル
 * - 下書き・オープン・クローズを数件ずつ入れる。オープンとクローズの議題には
 *   インタビュー設定と質問も入れる（P7 が P2b・P3 を待たずに動かせるように）
 * - 回答（インタビューセッション）は入れない。見たいときはローカルで実際にインタビューを回す
 *
 * 設計: docs/20261112_2009_AIインタビュー広場_機能設計.md、docs/20261112_2150_AIインタビュー広場_インタビュー対象の抽象化.md
 */

import type {
  PlazaSeedAccount,
  PlazaTopicFixture,
} from "./utils/plan-plaza-topic-seed";

/** ログイン用（ローカル開発のみ）。パスワードは seed.sql の admin@example.com と同じ形 */
export const plazaSeedAccounts: PlazaSeedAccount[] = [
  {
    email: "legislator-a@example.com",
    password: "legislator123456",
    displayName: "サンプル議員A",
    role: "legislator",
    factionName: "jimin-sapporo",
  },
  {
    email: "legislator-b@example.com",
    password: "legislator123456",
    displayName: "サンプル議員B",
    role: "legislator",
    factionName: "minshu-shimin-sapporo",
  },
  {
    email: "candidate-c@example.com",
    password: "candidate123456",
    displayName: "サンプル候補者C",
    role: "candidate",
    factionName: null,
  },
];

const A = "legislator-a@example.com";
const B = "legislator-b@example.com";
const C = "candidate-c@example.com";

export const plazaTopicFixtures: PlazaTopicFixture[] = [
  // ── オープン（1人1つ） ──
  {
    authorEmail: A,
    title: "冬の除雪で、いちばん困っていることは何ですか",
    bodyMd: `毎年の除雪について、市には多くの声が寄せられています。
ただ、困りごとは住んでいる場所や暮らし方によって大きく違います。

## 聞きたいこと

- 自宅の前や通学路・通勤路で、困った場面
- 除雪の時間帯や頻度について感じていること
- 市の情報（除雪の予定・連絡先など）の届き方

## 背景

- 除雪は、幹線道路・生活道路・歩道で担当や基準が分かれています
- 雪を置く場所が足りないことも、課題の一つになっています

正解はありません。あなたの経験をそのまま聞かせてください。`,
    state: { status: "open", openedDaysAgo: 3 },
    interview: {
      themes: ["除雪で困った場面", "時間帯と頻度", "情報の届き方"],
      estimatedDuration: 10,
      questions: [
        {
          question: "この冬、除雪のことで困った場面はありましたか？",
          followUpGuide:
            "場所（自宅前・通学路・バス停など）と、何が起きたかを具体的に聞いてください。",
          quickReplies: ["よくあった", "ときどきあった", "あまりなかった"],
        },
        {
          question: "除雪の時間帯や頻度について、どう感じていますか？",
          followUpGuide:
            "早朝・夜間などの時間帯や、来る回数について、理由も含めて聞いてください。",
          quickReplies: null,
        },
        {
          question: "除雪の予定や問い合わせ先の情報は、必要なときに手に入りますか？",
          followUpGuide:
            "どこで情報を探したか、何が分かりにくかったかを聞いてください。",
          quickReplies: ["手に入る", "探せば手に入る", "手に入らない"],
        },
      ],
    },
  },
  {
    authorEmail: B,
    title: "子育てをしていて、市に手伝ってほしいと感じるのはどんなときですか",
    bodyMd: `子育て支援の制度はたくさんありますが、
「知らなかった」「使いたいときに使えなかった」という声もよく聞きます。

制度の名前を知らなくても大丈夫です。
子育ての中で、**誰かに手伝ってほしかった場面**を教えてください。

- 保育園・幼稚園・学童のこと
- 病気のとき、休日・夜間のこと
- 相談先や手続きのこと`,
    state: { status: "open", openedDaysAgo: 10 },
    interview: {
      themes: ["手伝ってほしかった場面", "制度の使いやすさ", "相談先"],
      estimatedDuration: 10,
      questions: [
        {
          question: "子育ての中で、誰かに手伝ってほしいと感じたのはどんな場面でしたか？",
          followUpGuide:
            "時期（乳幼児期・小学生など）と、そのときの状況を具体的に聞いてください。",
          quickReplies: null,
        },
        {
          question: "そのとき、使える制度や相談先は見つかりましたか？",
          followUpGuide:
            "見つかった場合は使いやすさを、見つからなかった場合はどこを探したかを聞いてください。",
          quickReplies: ["見つかった", "見つかったが使えなかった", "見つからなかった"],
        },
        {
          question: "市の子育て支援で、いちばん変えてほしいことを一つ挙げるとしたら何ですか？",
          followUpGuide: "理由と、変わったら暮らしがどう変わるかを聞いてください。",
          quickReplies: null,
        },
      ],
    },
  },
  {
    authorEmail: C,
    title: "地下鉄・バスで使いにくいと感じるところを教えてください",
    bodyMd: `地下鉄やバスは、通勤・通学・通院など毎日の暮らしを支えています。
一方で、乗り継ぎや本数、駅やバス停の使いやすさについての声もあります。

ふだん使っている人も、使っていない人も、理由を含めて聞かせてください。`,
    state: { status: "open", openedDaysAgo: 20 },
    interview: {
      themes: ["使っている場面", "使いにくいところ", "使わない理由"],
      estimatedDuration: 8,
      questions: [
        {
          question: "地下鉄やバスを、どのくらいの頻度で使っていますか？",
          followUpGuide: "主な目的（通勤・通学・通院・買い物など）も聞いてください。",
          quickReplies: ["ほぼ毎日", "週に数回", "月に数回", "ほとんど使わない"],
        },
        {
          question: "使っていて、使いにくいと感じるのはどんなところですか？",
          followUpGuide:
            "使っていない人には、使わない理由を聞いてください。場所や路線が分かれば具体的に。",
          quickReplies: null,
        },
      ],
    },
  },

  // ── クローズ ──
  {
    authorEmail: A,
    title: "近くの公園を、どんなふうに使いたいですか",
    bodyMd: `公園は、子どもの遊び場、散歩、地域の行事など、いろいろな使われ方をしています。
近くの公園で「こう使えたらいいのに」と思うことを聞かせてください。`,
    state: {
      status: "closed",
      openedDaysAgo: 60,
      closedReason: "manual",
      closedAfterDays: 21,
    },
    interview: {
      themes: ["いまの使い方", "使いたい使い方"],
      estimatedDuration: 8,
      questions: [
        {
          question: "近くの公園を、ふだんどんなふうに使っていますか？",
          followUpGuide: "使っていない場合は、その理由を聞いてください。",
          quickReplies: null,
        },
        {
          question: "公園で「こう使えたらいいのに」と思うことはありますか？",
          followUpGuide: "季節（夏・冬）による違いがあれば、それも聞いてください。",
          quickReplies: null,
        },
      ],
    },
  },
  {
    authorEmail: B,
    title: "図書館に、これからどんな役割を期待しますか",
    bodyMd: `本を借りる場所としてだけでなく、学習や交流の場として図書館を使う人が増えています。
あなたが図書館に期待することを教えてください。`,
    state: { status: "closed", openedDaysAgo: 45, closedReason: "expired" },
    interview: {
      themes: ["いまの使い方", "期待する役割"],
      estimatedDuration: 8,
      questions: [
        {
          question: "図書館を最後に使ったのはいつ頃で、何のためでしたか？",
          followUpGuide: "使っていない場合は、その理由を聞いてください。",
          quickReplies: ["この1か月以内", "この1年以内", "1年以上前", "使ったことがない"],
        },
        {
          question: "これからの図書館に、どんな役割を期待しますか？",
          followUpGuide: "具体的な場面（勉強・子連れ・調べもの・交流など）を聞いてください。",
          quickReplies: null,
        },
      ],
    },
  },
  {
    authorEmail: C,
    title: "町内会・自治会との関わりについて聞かせてください",
    bodyMd: `町内会・自治会は、ごみステーションの管理や見守り、防災など、地域の暮らしを支えています。
一方で、担い手不足や加入率の低下も課題になっています。

関わっている人も、関わっていない人も、率直な考えを聞かせてください。`,
    state: {
      status: "closed",
      openedDaysAgo: 90,
      closedReason: "manual",
      closedAfterDays: 28,
    },
    interview: {
      themes: ["いまの関わり", "関わり方への考え"],
      estimatedDuration: 10,
      questions: [
        {
          question: "町内会・自治会に、いまどのくらい関わっていますか？",
          followUpGuide: "役員・行事への参加・加入のみ・未加入など、状況を聞いてください。",
          quickReplies: ["役員などをしている", "行事に参加する", "加入しているだけ", "加入していない"],
        },
        {
          question: "町内会・自治会の活動で、続けてほしいこと・変えてほしいことはありますか？",
          followUpGuide: "理由も含めて聞いてください。",
          quickReplies: null,
        },
      ],
    },
  },

  // ── 下書き ──
  {
    authorEmail: A,
    title: "観光客が増えて、暮らしに変化はありましたか",
    bodyMd: `観光客の増加は、まちのにぎわいにつながる一方で、暮らしへの影響を感じる人もいます。

（下書き: 聞きたいことを整理中）`,
    state: { status: "draft", createdDaysAgo: 2 },
    interview: null,
  },
  {
    authorEmail: B,
    title: "家族の通院の付き添いで困っていること",
    // 本文を書き始める前の下書き（下書きは本文が空でもよい）
    bodyMd: "",
    state: { status: "draft", createdDaysAgo: 1 },
    interview: null,
  },
  {
    authorEmail: C,
    title: "空き家が近所にあって、気になっていること",
    bodyMd: `近所の空き家について、雪下ろしや防犯の面で気になっている人がいるかもしれません。
どんな場面で気になるのかを聞きたいと考えています。`,
    state: { status: "draft", createdDaysAgo: 5 },
    interview: {
      themes: ["気になっている場面"],
      estimatedDuration: 5,
      questions: [
        {
          question: "近所の空き家について、気になっていることはありますか？",
          followUpGuide: "雪・防犯・景観など、どんな場面かを聞いてください。",
          quickReplies: null,
        },
      ],
    },
  },
];
