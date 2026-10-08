import {
  adminClient,
  cleanupTestCouncilSession,
  createTestCouncilSession,
} from "@test-utils/utils";
import { afterEach, describe, expect, it } from "vitest";
import { findGeneralQuestionOverviewBySession } from "./general-questions-repository";

describe("findGeneralQuestionOverviewBySession 統合テスト", () => {
  const sessionIds: string[] = [];

  afterEach(async () => {
    // general_question_overviews は council_sessions の削除で cascade される
    for (const id of sessionIds) {
      await cleanupTestCouncilSession(id);
    }
    sessionIds.length = 0;
  });

  async function createSession() {
    const session = await createTestCouncilSession({
      slug: `test-gq-overview-${Date.now()}-${Math.random()}`,
    });
    sessionIds.push(session.id);
    return session;
  }

  it("3行まとめが無い会期は lines=null・themeLines={} を返す", async () => {
    const session = await createSession();

    expect(await findGeneralQuestionOverviewBySession(session.id)).toEqual({
      lines: null,
      themeLines: {},
    });
  });

  it("全体の3行とテーマ別の3行を返す", async () => {
    const session = await createSession();
    const { error } = await adminClient
      .from("general_question_overviews")
      .insert({
        council_session_id: session.id,
        lines: ["一行目", "二行目", "三行目"],
        theme_lines: { "子育て・教育": ["保育", "教育", "給食"] },
      });
    if (error) throw new Error(`overview 作成失敗: ${error.message}`);

    expect(await findGeneralQuestionOverviewBySession(session.id)).toEqual({
      lines: ["一行目", "二行目", "三行目"],
      themeLines: { "子育て・教育": ["保育", "教育", "給食"] },
    });
  });
});
