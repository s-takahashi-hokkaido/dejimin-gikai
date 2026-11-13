import { createClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../../../packages/supabase/types/supabase.types";
import {
  adminClient,
  cleanupTestFaction,
  cleanupTestInterviewTopic,
  cleanupTestUser,
  closedTopicColumns,
  createTestAccount,
  createTestFaction,
  createTestInterviewTopic,
  openTopicColumns,
  type TestUser,
} from "../utils";

/**
 * 作成者のアカウント（admin_profiles）を削除したら、その人の下書きの議題を消し、公開した議題は残す
 * （マイグレーション 20261113090000、トリガー関数 delete_draft_interview_topics_of_author）
 */

const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54121";
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

/** admin アプリの createAuditedAdminClient と同じく、x-audit-actor ヘッダで実行者を渡す */
const actor = {
  id: "00000000-0000-0000-0000-0000000000ab",
  email: "operator-topics@example.com",
  role: "admin",
  factionId: null,
};
const auditedClient = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
  global: {
    headers: {
      "x-audit-actor": Buffer.from(JSON.stringify(actor), "utf8").toString(
        "base64"
      ),
    },
  },
});

describe("アカウント削除時の下書きの議題", () => {
  let factionId: string;
  let author: TestUser;
  let other: TestUser;
  const userIds: string[] = [];
  const topicIds: string[] = [];

  async function createTopic(
    ...args: Parameters<typeof createTestInterviewTopic>
  ) {
    const topic = await createTestInterviewTopic(...args);
    topicIds.push(topic.id);
    return topic;
  }

  /** 削除対象の作成者に、下書き2つ・オープン1つ・クローズ1つを作る。ほかの人にも下書きを1つ作る */
  async function createTopics() {
    return {
      drafts: [
        await createTopic(author.id, { title: "下書き1" }),
        await createTopic(author.id, { title: "下書き2", body_md: "" }),
      ],
      open: await createTopic(author.id, openTopicColumns()),
      closed: await createTopic(author.id, closedTopicColumns()),
      othersDraft: await createTopic(other.id, { title: "ほかの人の下書き" }),
    };
  }

  async function findTopics(ids: string[]) {
    const { data, error } = await adminClient
      .from("interview_topics")
      .select("id, author_user_id, status, author_display_name")
      .in("id", ids);
    expect(error).toBeNull();
    return data ?? [];
  }

  beforeEach(async () => {
    factionId = (await createTestFaction()).id;
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    author = await createTestAccount({
      role: "legislator",
      factionId,
      email: `topic-author-${suffix}@example.com`,
    });
    other = await createTestAccount({
      role: "candidate",
      email: `topic-other-${suffix}@example.com`,
    });
    userIds.push(author.id, other.id);
  });

  afterEach(async () => {
    while (topicIds.length > 0) {
      const id = topicIds.pop();
      if (id) await cleanupTestInterviewTopic(id);
    }
    while (userIds.length > 0) {
      const id = userIds.pop();
      if (id) await cleanupTestUser(id);
    }
    await cleanupTestFaction(factionId);
  });

  it("プロフィールを消すと、その人の下書きだけが消え、公開した議題は写しで残る", async () => {
    const topics = await createTopics();

    const { error } = await adminClient
      .from("admin_profiles")
      .delete()
      .eq("user_id", author.id);
    expect(error).toBeNull();

    const remaining = await findTopics([
      ...topics.drafts.map((t) => t.id),
      topics.open.id,
      topics.closed.id,
      topics.othersDraft.id,
    ]);
    const byId = new Map(remaining.map((t) => [t.id, t]));

    for (const draft of topics.drafts) {
      expect(byId.has(draft.id)).toBe(false);
    }
    // 公開した議題は残り、作成者は null（表示は写し）になる（K7）
    expect(byId.get(topics.open.id)).toMatchObject({
      author_user_id: null,
      status: "open",
      author_display_name: "テスト議員",
    });
    expect(byId.get(topics.closed.id)).toMatchObject({
      author_user_id: null,
      status: "closed",
    });
    // ほかの人の下書きは消さない
    expect(byId.get(topics.othersDraft.id)).toMatchObject({
      author_user_id: other.id,
      status: "draft",
    });
  });

  it("Auth ユーザーの削除（カスケード）でも、下書きを消す", async () => {
    const topics = await createTopics();

    const { error } = await adminClient.auth.admin.deleteUser(author.id);
    expect(error).toBeNull();

    const remaining = await findTopics([
      ...topics.drafts.map((t) => t.id),
      topics.open.id,
      topics.othersDraft.id,
    ]);
    const ids = remaining.map((t) => t.id);
    expect(ids).not.toContain(topics.drafts[0].id);
    expect(ids).not.toContain(topics.drafts[1].id);
    expect(ids).toContain(topics.open.id);
    expect(ids).toContain(topics.othersDraft.id);
  });

  it("消した下書きは、プロフィールを消した実行者つきで監査ログに残る", async () => {
    const topics = await createTopics();

    const { error } = await auditedClient
      .from("admin_profiles")
      .delete()
      .eq("user_id", author.id);
    expect(error).toBeNull();

    const { data: logs, error: logError } = await adminClient
      .from("admin_audit_logs")
      .select("target_id, actor_email, actor_role, before_data")
      .eq("action", "interview_topics.delete")
      .in(
        "target_id",
        topics.drafts.map((t) => t.id)
      );
    expect(logError).toBeNull();
    expect(logs).toHaveLength(2);
    for (const log of logs ?? []) {
      expect(log.actor_email).toBe(actor.email);
      expect(log.actor_role).toBe("admin");
    }
  });

  it("下書きが無ければ、プロフィールの削除はそのまま通る", async () => {
    const { error } = await adminClient
      .from("admin_profiles")
      .delete()
      .eq("user_id", other.id);
    expect(error).toBeNull();

    const { data } = await adminClient
      .from("admin_profiles")
      .select("user_id")
      .eq("user_id", other.id);
    expect(data).toEqual([]);
  });
});
