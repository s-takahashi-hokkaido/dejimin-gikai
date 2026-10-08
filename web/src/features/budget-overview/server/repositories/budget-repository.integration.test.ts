import {
  adminClient,
  cleanupTestCouncilSession,
  createTestCouncilSession,
} from "@test-utils/utils";
import { afterEach, describe, expect, it } from "vitest";
import { findLatestSessionWithBudget } from "./budget-repository";

/**
 * 既存データより新しい日付（2099 年）の会期を作り、
 * 「予算のある最新の会期」が意図どおりに選ばれるかを見る。
 */
describe("findLatestSessionWithBudget 統合テスト", () => {
  const sessionIds: string[] = [];

  afterEach(async () => {
    // budget_overviews は council_sessions に cascade しないので先に消す
    await adminClient
      .from("budget_overviews")
      .delete()
      .in("council_session_id", sessionIds);
    for (const id of sessionIds) {
      await cleanupTestCouncilSession(id);
    }
    sessionIds.length = 0;
  });

  async function createSession(
    overrides: Parameters<typeof createTestCouncilSession>[0]
  ) {
    const session = await createTestCouncilSession({
      slug: `test-budget-${Date.now()}-${Math.random()}`,
      ...overrides,
    });
    sessionIds.push(session.id);
    return session;
  }

  async function createOverview(
    councilSessionId: string,
    publishStatus: "draft" | "published"
  ) {
    const { error } = await adminClient.from("budget_overviews").insert({
      council_session_id: councilSessionId,
      department_name: "テスト局",
      department_slug: `test-${Date.now()}-${Math.random()}`,
      publish_status: publishStatus,
    });
    if (error) throw new Error(`budget_overview 作成失敗: ${error.message}`);
  }

  it("開会中でも予算の無い会期は飛ばし、予算のある最新の会期を返す", async () => {
    const budgetSession = await createSession({
      name: "令和81年第1回定例会",
      start_date: "2099-02-15",
      end_date: "2099-03-25",
    });
    await createOverview(budgetSession.id, "published");
    await createSession({
      name: "令和81年第3回定例会",
      start_date: "2099-09-15",
      end_date: "2099-10-25",
      is_active: true,
    });

    const latest = await findLatestSessionWithBudget();

    expect(latest?.id).toBe(budgetSession.id);
    expect(latest?.slug).toBe(budgetSession.slug);
    // 結合に使った budget_overviews は返さない
    expect(latest).not.toHaveProperty("budget_overviews");
  });

  it("下書きの予算概要しか無い会期は対象にしない", async () => {
    const publishedSession = await createSession({
      name: "令和81年第1回定例会",
      start_date: "2099-02-15",
      end_date: "2099-03-25",
    });
    await createOverview(publishedSession.id, "published");
    const draftSession = await createSession({
      name: "令和82年第1回定例会",
      start_date: "2100-02-15",
      end_date: "2100-03-25",
    });
    await createOverview(draftSession.id, "draft");

    const latest = await findLatestSessionWithBudget();

    expect(latest?.id).toBe(publishedSession.id);
  });
});
