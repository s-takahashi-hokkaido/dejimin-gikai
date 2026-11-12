/**
 * AIインタビュー広場の議題（`interview_topics`）の seed の行を組み立てる純粋関数。
 *
 * DB にも環境変数にも触らないので、同階層の `plan-plaza-topic-seed.test.ts` でテストする。
 * 状態ごとの日時と作成者の写しの入れ方（DB の CHECK 制約と同じ規則）をここに集めている。
 * 設計: docs/20261112_2150_AIインタビュー広場_インタビュー対象の抽象化.md
 */

import type { Database } from "@dejimin-gikai/supabase";

type InterviewTopicInsert =
  Database["public"]["Tables"]["interview_topics"]["Insert"];
type InterviewConfigInsert =
  Database["public"]["Tables"]["interview_configs"]["Insert"];
type InterviewQuestionInsert =
  Database["public"]["Tables"]["interview_questions"]["Insert"];

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * オープンから自動クローズまでの日数（機能設計 §6-4 の設定値）。
 * seed の日時を組み立てるためだけに使う。アプリ側の定数は P3・P9 で持つ。
 */
export const PLAZA_SEED_OPEN_DAYS = 30;

/** seed で作る、議題の作成者になる管理画面のアカウント */
export type PlazaSeedAccount = {
  email: string;
  password: string;
  displayName: string;
  role: "legislator" | "candidate";
  /** 所属会派の factions.name（議員のみ。候補者は null） */
  factionName: string | null;
};

/** 作成済みのアカウントを、写しを作るのに必要な形にしたもの */
export type PlazaSeedAuthor = {
  userId: string;
  displayName: string;
  role: "legislator" | "candidate";
  /** 所属会派の表示名（factions.display_name。候補者は null） */
  factionDisplayName: string | null;
};

export type PlazaSeedQuestion = {
  question: string;
  followUpGuide: string | null;
  quickReplies: string[] | null;
};

export type PlazaSeedInterview = {
  themes: string[];
  /** 目安所要時間（分） */
  estimatedDuration: number;
  questions: PlazaSeedQuestion[];
};

export type PlazaTopicState =
  | { status: "draft"; createdDaysAgo: number }
  | { status: "open"; openedDaysAgo: number }
  | {
      status: "closed";
      openedDaysAgo: number;
      /** manual: オープンから closedAfterDays 日後に作成者がクローズ ／ expired: 期限で自動クローズ */
      closedReason: "manual" | "expired";
      closedAfterDays?: number;
    };

export type PlazaTopicFixture = {
  authorEmail: string;
  title: string;
  bodyMd: string;
  state: PlazaTopicState;
  /** オープン・クローズの議題には必須（オープンには設定が要るため。機能設計 §3） */
  interview: PlazaSeedInterview | null;
};

export type PlannedPlazaTopic = {
  topic: InterviewTopicInsert;
  interview: {
    config: Omit<InterviewConfigInsert, "interview_topic_id">;
    questions: Omit<InterviewQuestionInsert, "interview_config_id">[];
  } | null;
};

function daysBefore(now: Date, days: number): Date {
  return new Date(now.getTime() - days * DAY_MS);
}

function daysAfter(base: Date, days: number): Date {
  return new Date(base.getTime() + days * DAY_MS);
}

/** 状態ごとの日時。DB の CHECK 制約（interview_topics_status_timestamps）と同じ規則で入れる */
export function buildTopicTimestamps(
  state: PlazaTopicState,
  now: Date,
  openDays: number = PLAZA_SEED_OPEN_DAYS
): Pick<
  InterviewTopicInsert,
  | "status"
  | "created_at"
  | "opened_at"
  | "closes_at"
  | "closed_at"
  | "closed_reason"
> {
  if (state.status === "draft") {
    return {
      status: "draft",
      created_at: daysBefore(now, state.createdDaysAgo).toISOString(),
      opened_at: null,
      closes_at: null,
      closed_at: null,
      closed_reason: null,
    };
  }

  const openedAt = daysBefore(now, state.openedDaysAgo);
  const closesAt = daysAfter(openedAt, openDays);
  // 下書きを作ってから1日後にオープンした、という体にする
  const createdAt = daysBefore(openedAt, 1);

  if (state.status === "open") {
    if (closesAt <= now) {
      throw new Error(
        `オープン中の議題の期限が過ぎています（openedDaysAgo: ${state.openedDaysAgo}）`
      );
    }
    return {
      status: "open",
      created_at: createdAt.toISOString(),
      opened_at: openedAt.toISOString(),
      closes_at: closesAt.toISOString(),
      closed_at: null,
      closed_reason: null,
    };
  }

  let closedAt: Date;
  if (state.closedReason === "expired") {
    closedAt = closesAt;
  } else {
    if (state.closedAfterDays === undefined) {
      throw new Error("作成者がクローズした議題には closedAfterDays が必要です");
    }
    closedAt = daysAfter(openedAt, state.closedAfterDays);
  }
  if (closedAt > now || closedAt > closesAt) {
    throw new Error(
      `クローズ日時が現在または期限より後になっています（openedDaysAgo: ${state.openedDaysAgo}）`
    );
  }

  return {
    status: "closed",
    created_at: createdAt.toISOString(),
    opened_at: openedAt.toISOString(),
    closes_at: closesAt.toISOString(),
    closed_at: closedAt.toISOString(),
    closed_reason: state.closedReason,
  };
}

/**
 * 議題の seed を、挿入する行に組み立てる。
 *
 * - オープン・クローズの議題には、オープン時点の作成者の写し（K7）を入れる。下書きには入れない
 * - オープン中の議題は1人1つ（DB の部分ユニークインデックスと同じ規則）
 * - 議題のインタビュー設定の status は使わないので入れない（既定値 closed のまま。D2 §3-2）
 */
export function planPlazaTopicSeed({
  fixtures,
  authors,
  now,
  openDays = PLAZA_SEED_OPEN_DAYS,
}: {
  fixtures: readonly PlazaTopicFixture[];
  authors: ReadonlyMap<string, PlazaSeedAuthor>;
  now: Date;
  openDays?: number;
}): PlannedPlazaTopic[] {
  const openAuthors = new Set<string>();

  return fixtures.map((fixture) => {
    const author = authors.get(fixture.authorEmail);
    if (!author) {
      throw new Error(`議題の作成者が見つかりません: ${fixture.authorEmail}`);
    }

    const { status } = fixture.state;
    if (status === "open") {
      if (openAuthors.has(fixture.authorEmail)) {
        throw new Error(
          `オープン中の議題は1人1つまでです: ${fixture.authorEmail}`
        );
      }
      openAuthors.add(fixture.authorEmail);
    }
    if (status !== "draft" && !fixture.interview) {
      throw new Error(
        `オープン・クローズの議題にはインタビュー設定が必要です: ${fixture.title}`
      );
    }

    const isPublished = status !== "draft";
    const topic: InterviewTopicInsert = {
      author_user_id: author.userId,
      title: fixture.title,
      body_md: fixture.bodyMd,
      ...buildTopicTimestamps(fixture.state, now, openDays),
      author_display_name: isPublished ? author.displayName : null,
      author_role: isPublished ? author.role : null,
      author_faction_name: isPublished ? author.factionDisplayName : null,
    };

    const interview = fixture.interview
      ? {
          config: {
            name: "デフォルト設定",
            mode: "loop" as const,
            themes: fixture.interview.themes,
            estimated_duration: fixture.interview.estimatedDuration,
          },
          questions: fixture.interview.questions.map((q, index) => ({
            question: q.question,
            follow_up_guide: q.followUpGuide,
            quick_replies: q.quickReplies,
            question_order: index + 1,
          })),
        }
      : null;

    return { topic, interview };
  });
}
