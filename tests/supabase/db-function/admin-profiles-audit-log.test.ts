import { createClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../../../packages/supabase/types/supabase.types";
import {
  adminClient,
  cleanupTestFaction,
  cleanupTestUser,
  createTestFaction,
  createTestUser,
  type TestUser,
} from "../utils";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54121";
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

/** admin アプリの createAuditedAdminClient と同じく、x-audit-actor ヘッダで実行者を渡す */
const actor = {
  id: "00000000-0000-0000-0000-0000000000aa",
  email: "operator@example.com",
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

/**
 * 管理画面のアカウント（admin_profiles）の招待・ロール変更・削除が、
 * 実行者付きで監査ログに残ること（マイグレーション 20261010000000）
 */
describe("admin_profiles の監査ログ", () => {
  let user: TestUser;
  let factionId: string;

  beforeEach(async () => {
    user = await createTestUser();
    factionId = (await createTestFaction()).id;
  });

  afterEach(async () => {
    await cleanupTestUser(user.id);
    await cleanupTestFaction(factionId);
  });

  async function findLogs(action: string) {
    const { data, error } = await adminClient
      .from("admin_audit_logs")
      .select("*")
      .eq("target_table", "admin_profiles")
      .eq("target_id", user.id)
      .eq("action", action);
    expect(error).toBeNull();
    return data ?? [];
  }

  it("作成・ロール変更・削除を、対象のユーザーIDと実行者付きで記録する", async () => {
    const { error: insertError } = await auditedClient
      .from("admin_profiles")
      .insert({ user_id: user.id, role: "candidate", display_name: "出馬者A" });
    expect(insertError).toBeNull();

    const { error: updateError } = await auditedClient
      .from("admin_profiles")
      .update({ role: "legislator", faction_id: factionId })
      .eq("user_id", user.id);
    expect(updateError).toBeNull();

    const { error: deleteError } = await auditedClient
      .from("admin_profiles")
      .delete()
      .eq("user_id", user.id);
    expect(deleteError).toBeNull();

    const [inserted] = await findLogs("admin_profiles.insert");
    expect(inserted).toMatchObject({
      actor_user_id: actor.id,
      actor_email: actor.email,
      actor_role: "admin",
      before_data: null,
    });

    const [updated] = await findLogs("admin_profiles.update");
    expect(updated.actor_email).toBe(actor.email);
    expect(updated.before_data).toMatchObject({
      role: "candidate",
      faction_id: null,
    });
    expect(updated.after_data).toMatchObject({
      role: "legislator",
      faction_id: factionId,
      display_name: "出馬者A",
    });

    const [deleted] = await findLogs("admin_profiles.delete");
    expect(deleted.actor_email).toBe(actor.email);
    expect(deleted.after_data).toBeNull();
  });

  it("中身の変わらない保存は記録しない", async () => {
    await auditedClient
      .from("admin_profiles")
      .insert({ user_id: user.id, role: "candidate", display_name: "出馬者A" });

    const { error } = await auditedClient
      .from("admin_profiles")
      .update({ display_name: "出馬者A" })
      .eq("user_id", user.id);
    expect(error).toBeNull();

    expect(await findLogs("admin_profiles.update")).toHaveLength(0);
  });
});
