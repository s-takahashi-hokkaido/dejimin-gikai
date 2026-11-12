import { createClient } from "@supabase/supabase-js";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "../../../packages/supabase/types/supabase.types";
import {
  adminClient,
  cleanupTestBill,
  cleanupTestFaction,
  cleanupTestInterviewTopic,
  cleanupTestUser,
  closedTopicColumns,
  createTestAccount,
  createTestBill,
  createTestFaction,
  createTestInterviewTopic,
  openTopicColumns,
  type TestUser,
} from "../utils";

/**
 * AIインタビュー広場の議題（interview_topics）と、インタビュー設定・論点分析の議題対応
 * （マイグレーション 20261112210000）。
 * 設計: docs/20261112_2150_AIインタビュー広場_インタビュー対象の抽象化.md
 */

const CHECK_VIOLATION = "23514";
const UNIQUE_VIOLATION = "23505";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54121";
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

let faction: { id: string };
let legislatorA: TestUser;
let legislatorB: TestUser;
const createdTopicIds: string[] = [];

/** 作った議題を afterEach で消すために覚えておく */
async function createTopic(
  ...args: Parameters<typeof createTestInterviewTopic>
) {
  const topic = await createTestInterviewTopic(...args);
  createdTopicIds.push(topic.id);
  return topic;
}

async function insertTopic(
  values: Partial<Database["public"]["Tables"]["interview_topics"]["Insert"]>
) {
  const { data, error } = await adminClient
    .from("interview_topics")
    .insert({
      author_user_id: legislatorA.id,
      title: "制約テストの議題",
      body_md: "本文",
      ...values,
    })
    .select()
    .single();
  if (data) createdTopicIds.push(data.id);
  return { data, error };
}

beforeAll(async () => {
  faction = await createTestFaction();
  legislatorA = await createTestAccount({
    role: "legislator",
    factionId: faction.id,
    email: `topic-legislator-a-${Date.now()}@example.com`,
  });
  legislatorB = await createTestAccount({
    role: "legislator",
    factionId: faction.id,
    email: `topic-legislator-b-${Date.now()}@example.com`,
  });
});

afterEach(async () => {
  while (createdTopicIds.length > 0) {
    const id = createdTopicIds.pop();
    if (id) await cleanupTestInterviewTopic(id);
  }
});

afterAll(async () => {
  await cleanupTestUser(legislatorA.id);
  await cleanupTestUser(legislatorB.id);
  await cleanupTestFaction(faction.id);
});

describe("interview_topics: オープンは1人1つ", () => {
  it("同じ作成者でオープンを2つ作れない", async () => {
    await createTopic(legislatorA.id, openTopicColumns());

    const { error } = await insertTopic(openTopicColumns());
    expect(error?.code).toBe(UNIQUE_VIOLATION);
  });

  it("下書きをオープンに変えるときも、2つ目は弾かれる", async () => {
    await createTopic(legislatorA.id, openTopicColumns());
    const draft = await createTopic(legislatorA.id);

    const { error } = await adminClient
      .from("interview_topics")
      .update(openTopicColumns())
      .eq("id", draft.id);
    expect(error?.code).toBe(UNIQUE_VIOLATION);
  });

  it("クローズすれば、同じ作成者が次の議題をオープンできる", async () => {
    await createTopic(legislatorA.id, closedTopicColumns());

    const { error } = await insertTopic(openTopicColumns());
    expect(error).toBeNull();
  });

  it("作成者が違えば、それぞれオープンを持てる", async () => {
    await createTopic(legislatorA.id, openTopicColumns());

    const { error } = await insertTopic({
      ...openTopicColumns(),
      author_user_id: legislatorB.id,
    });
    expect(error).toBeNull();
  });

  it("下書きは1人がいくつでも持てる（K4）", async () => {
    await createTopic(legislatorA.id);
    await createTopic(legislatorA.id);

    const { error } = await insertTopic({});
    expect(error).toBeNull();
  });
});

describe("interview_topics: 状態と日時の整合", () => {
  it("下書きは本文が空でも作れ、日時と写しを持たない", async () => {
    const { data, error } = await insertTopic({ body_md: "" });
    expect(error).toBeNull();
    expect(data).toMatchObject({
      status: "draft",
      opened_at: null,
      closes_at: null,
      closed_at: null,
      closed_reason: null,
      author_display_name: null,
    });
  });

  it("下書きはオープン日時を持てない", async () => {
    const { error } = await insertTopic({
      opened_at: new Date().toISOString(),
    });
    expect(error?.code).toBe(CHECK_VIOLATION);
  });

  it("オープンには opened_at と closes_at が要る", async () => {
    const { error: noClosesAt } = await insertTopic(
      openTopicColumns({ closes_at: null })
    );
    expect(noClosesAt?.code).toBe(CHECK_VIOLATION);

    const { error: noOpenedAt } = await insertTopic(
      openTopicColumns({ opened_at: null })
    );
    expect(noOpenedAt?.code).toBe(CHECK_VIOLATION);
  });

  it("オープンはクローズの日時・理由を持てない", async () => {
    const { error } = await insertTopic(
      openTopicColumns({ closed_reason: "manual" })
    );
    expect(error?.code).toBe(CHECK_VIOLATION);
  });

  it("期限はオープンより後でなければならない", async () => {
    const openedAt = new Date().toISOString();
    const { error } = await insertTopic(
      openTopicColumns({ opened_at: openedAt, closes_at: openedAt })
    );
    expect(error?.code).toBe(CHECK_VIOLATION);
  });

  it("クローズには closed_at と closed_reason が要る", async () => {
    const { error: noReason } = await insertTopic(
      closedTopicColumns({ closed_reason: null })
    );
    expect(noReason?.code).toBe(CHECK_VIOLATION);

    const { error: noClosedAt } = await insertTopic(
      closedTopicColumns({ closed_at: null })
    );
    expect(noClosedAt?.code).toBe(CHECK_VIOLATION);
  });

  it("クローズの理由は manual / expired のどちらか", async () => {
    const { error } = await insertTopic(
      closedTopicColumns({ closed_reason: "withdrawn" })
    );
    expect(error?.code).toBe(CHECK_VIOLATION);
  });

  it("クローズ日時はオープンより前にできない", async () => {
    const { error } = await insertTopic(
      closedTopicColumns({
        closed_at: new Date(
          Date.now() - 365 * 24 * 60 * 60 * 1000
        ).toISOString(),
      })
    );
    expect(error?.code).toBe(CHECK_VIOLATION);
  });

  it("状態は draft / open / closed のどれか", async () => {
    const { error } = await insertTopic({ status: "archived" });
    expect(error?.code).toBe(CHECK_VIOLATION);
  });

  it("タイトルは空にできない", async () => {
    const { error } = await insertTopic({ title: "  " });
    expect(error?.code).toBe(CHECK_VIOLATION);
  });
});

describe("interview_topics: 公開した議題は本文と作成者の写しを持つ（K7）", () => {
  it("オープンの議題は本文が空だと作れない", async () => {
    const { error } = await insertTopic(openTopicColumns({ body_md: " " }));
    expect(error?.code).toBe(CHECK_VIOLATION);
  });

  it("オープンの議題は写し（表示名・ロール）が無いと作れない", async () => {
    const { error: noName } = await insertTopic(
      openTopicColumns({ author_display_name: null })
    );
    expect(noName?.code).toBe(CHECK_VIOLATION);

    const { error: noRole } = await insertTopic(
      openTopicColumns({ author_role: null, author_faction_name: null })
    );
    expect(noRole?.code).toBe(CHECK_VIOLATION);
  });

  it("写しのロールは議員なら会派あり、候補者なら会派なし", async () => {
    const { error: legislatorWithoutFaction } = await insertTopic(
      openTopicColumns({ author_role: "legislator", author_faction_name: null })
    );
    expect(legislatorWithoutFaction?.code).toBe(CHECK_VIOLATION);

    const { error: candidateWithFaction } = await insertTopic(
      openTopicColumns({
        author_role: "candidate",
        author_faction_name: "会派",
      })
    );
    expect(candidateWithFaction?.code).toBe(CHECK_VIOLATION);

    const { error: candidate } = await insertTopic(
      openTopicColumns({ author_role: "candidate", author_faction_name: null })
    );
    expect(candidate).toBeNull();
  });

  it("写しのロールに運営者は入れられない（K3）", async () => {
    const { error } = await insertTopic(
      openTopicColumns({ author_role: "admin", author_faction_name: null })
    );
    expect(error?.code).toBe(CHECK_VIOLATION);
  });
});

describe("interview_topics: 取り下げ", () => {
  it("取り下げは日時と理由をそろえて持つ", async () => {
    const { error: noReason } = await insertTopic(
      closedTopicColumns({ withdrawn_at: new Date().toISOString() })
    );
    expect(noReason?.code).toBe(CHECK_VIOLATION);

    const { error: blankReason } = await insertTopic(
      closedTopicColumns({
        withdrawn_at: new Date().toISOString(),
        withdrawn_reason: " ",
      })
    );
    expect(blankReason?.code).toBe(CHECK_VIOLATION);

    const { error } = await insertTopic(
      closedTopicColumns({
        withdrawn_at: new Date().toISOString(),
        withdrawn_reason: "個人を特定できる内容が含まれていたため",
      })
    );
    expect(error).toBeNull();
  });

  it("下書きは取り下げの対象にしない", async () => {
    const { error } = await insertTopic({
      withdrawn_at: new Date().toISOString(),
      withdrawn_reason: "理由",
    });
    expect(error?.code).toBe(CHECK_VIOLATION);
  });
});

describe("interview_topics: 作成者のアカウント削除（K7）", () => {
  it("作成者を削除しても議題は残り、作成者は null・写しはそのままになる", async () => {
    const author = await createTestAccount({
      role: "candidate",
      email: `topic-candidate-${Date.now()}@example.com`,
    });
    const topic = await createTopic(
      author.id,
      closedTopicColumns({
        author_display_name: "削除される候補者",
        author_role: "candidate",
        author_faction_name: null,
      })
    );

    // 管理画面のアカウント削除と同じく、admin_profiles を消してから Auth ユーザーを消す
    const { error: profileError } = await adminClient
      .from("admin_profiles")
      .delete()
      .eq("user_id", author.id);
    expect(profileError).toBeNull();
    await cleanupTestUser(author.id);

    const { data } = await adminClient
      .from("interview_topics")
      .select("author_user_id, author_display_name, author_role")
      .eq("id", topic.id)
      .single();
    expect(data).toEqual({
      author_user_id: null,
      author_display_name: "削除される候補者",
      author_role: "candidate",
    });
  });
});

describe("interview_topics: 監査ログ", () => {
  it("作成・更新・削除を、実行者付きで記録する", async () => {
    const actor = {
      id: legislatorA.id,
      email: legislatorA.email,
      role: "legislator",
      factionId: faction.id,
    };
    const auditedClient = createClient<Database>(
      SUPABASE_URL,
      SERVICE_ROLE_KEY,
      {
        global: {
          headers: {
            "x-audit-actor": Buffer.from(
              JSON.stringify(actor),
              "utf8"
            ).toString("base64"),
          },
        },
      }
    );

    const { data: topic, error: insertError } = await auditedClient
      .from("interview_topics")
      .insert({
        author_user_id: legislatorA.id,
        title: "監査ログの議題",
        body_md: "本文",
      })
      .select()
      .single();
    expect(insertError).toBeNull();
    if (!topic) throw new Error("議題が作れませんでした");
    createdTopicIds.push(topic.id);

    await auditedClient
      .from("interview_topics")
      .update({ title: "監査ログの議題（修正）" })
      .eq("id", topic.id);
    await auditedClient.from("interview_topics").delete().eq("id", topic.id);

    const { data: logs, error } = await adminClient
      .from("admin_audit_logs")
      .select("action, actor_user_id, actor_role, bill_id")
      .eq("target_table", "interview_topics")
      .eq("target_id", topic.id)
      .order("created_at", { ascending: true });
    expect(error).toBeNull();
    expect(logs).toEqual([
      {
        action: "interview_topics.insert",
        actor_user_id: legislatorA.id,
        actor_role: "legislator",
        bill_id: null,
      },
      {
        action: "interview_topics.update",
        actor_user_id: legislatorA.id,
        actor_role: "legislator",
        bill_id: null,
      },
      {
        action: "interview_topics.delete",
        actor_user_id: legislatorA.id,
        actor_role: "legislator",
        bill_id: null,
      },
    ]);
  });
});

describe("interview_configs: 議案か議題のどちらか一方に紐づく", () => {
  let bill: { id: string };

  beforeAll(async () => {
    bill = await createTestBill();
  });

  afterAll(async () => {
    await cleanupTestBill(bill.id);
  });

  it("議案と議題の両方に紐づく設定は作れない", async () => {
    const topic = await createTopic(legislatorA.id);
    const { error } = await adminClient.from("interview_configs").insert({
      bill_id: bill.id,
      interview_topic_id: topic.id,
      name: "両方",
    });
    expect(error?.code).toBe(CHECK_VIOLATION);
  });

  it("どちらにも紐づかない設定は作れない", async () => {
    const { error } = await adminClient
      .from("interview_configs")
      .insert({ name: "どちらでもない" });
    expect(error?.code).toBe(CHECK_VIOLATION);
  });

  it("議案の設定を議題にも紐づけ直すことはできない", async () => {
    const topic = await createTopic(legislatorA.id);
    const { data: config } = await adminClient
      .from("interview_configs")
      .insert({ bill_id: bill.id, name: "議案の設定" })
      .select()
      .single();
    if (!config) throw new Error("設定が作れませんでした");

    const { error } = await adminClient
      .from("interview_configs")
      .update({ interview_topic_id: topic.id })
      .eq("id", config.id);
    expect(error?.code).toBe(CHECK_VIOLATION);

    await adminClient.from("interview_configs").delete().eq("id", config.id);
  });

  it("議題の設定は1つだけ作れ、議題を消すと設定と質問も消える", async () => {
    const topic = await createTopic(legislatorA.id);
    const { data: config, error } = await adminClient
      .from("interview_configs")
      .insert({ interview_topic_id: topic.id, name: "議題の設定" })
      .select()
      .single();
    expect(error).toBeNull();
    if (!config) throw new Error("設定が作れませんでした");
    // 議題の設定の status は使わないので、既定値のまま
    expect(config.status).toBe("closed");

    const { error: secondError } = await adminClient
      .from("interview_configs")
      .insert({ interview_topic_id: topic.id, name: "2つ目" });
    expect(secondError?.code).toBe(UNIQUE_VIOLATION);

    await adminClient.from("interview_questions").insert({
      interview_config_id: config.id,
      question: "質問",
      question_order: 1,
    });
    await cleanupTestInterviewTopic(topic.id);

    const { count: configCount } = await adminClient
      .from("interview_configs")
      .select("id", { count: "exact", head: true })
      .eq("id", config.id);
    expect(configCount).toBe(0);
    const { count: questionCount } = await adminClient
      .from("interview_questions")
      .select("id", { count: "exact", head: true })
      .eq("interview_config_id", config.id);
    expect(questionCount).toBe(0);
  });
});

describe("topic_analysis_versions: 議案か議題のどちらか一方に紐づく", () => {
  let bill: { id: string };

  beforeAll(async () => {
    bill = await createTestBill();
  });

  afterAll(async () => {
    await cleanupTestBill(bill.id);
  });

  it("議案と議題の両方、またはどちらにも紐づかないバージョンは作れない", async () => {
    const topic = await createTopic(legislatorA.id, closedTopicColumns());

    const { error: both } = await adminClient
      .from("topic_analysis_versions")
      .insert({ bill_id: bill.id, interview_topic_id: topic.id, version: 1 });
    expect(both?.code).toBe(CHECK_VIOLATION);

    const { error: neither } = await adminClient
      .from("topic_analysis_versions")
      .insert({ version: 1 });
    expect(neither?.code).toBe(CHECK_VIOLATION);
  });

  it("バージョン番号は議題ごとに一意で、議案の番号とは別に数える", async () => {
    const topic = await createTopic(legislatorA.id, closedTopicColumns());

    const { error: billVersion } = await adminClient
      .from("topic_analysis_versions")
      .insert({ bill_id: bill.id, version: 1 });
    expect(billVersion).toBeNull();

    const { error: topicVersion } = await adminClient
      .from("topic_analysis_versions")
      .insert({ interview_topic_id: topic.id, version: 1 });
    expect(topicVersion).toBeNull();

    const { error: duplicate } = await adminClient
      .from("topic_analysis_versions")
      .insert({ interview_topic_id: topic.id, version: 1 });
    expect(duplicate?.code).toBe(UNIQUE_VIOLATION);
  });
});
