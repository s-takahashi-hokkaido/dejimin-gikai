import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  adminClient,
  cleanupTestFaction,
  cleanupTestUser,
  createTestAccount,
  createTestAdminUser,
  createTestFaction,
  createTestUser,
  getAnonClient,
  type TestUser,
} from "../utils";

describe("get_admin_accounts() 関数", () => {
  let testUsers: TestUser[] = [];
  let factionIds: string[] = [];

  beforeEach(async () => {
    testUsers = [];
    factionIds = [];
  });

  afterEach(async () => {
    for (const user of testUsers) {
      await cleanupTestUser(user.id);
    }
    for (const id of factionIds) {
      await cleanupTestFaction(id);
    }
  });

  it("admin_profiles を持つユーザーだけを、ロールに関わらず返す", async () => {
    const faction = await createTestFaction();
    factionIds.push(faction.id);
    const admin = await createTestAdminUser(`admin-${Date.now()}@example.com`);
    const legislator = await createTestAccount({
      role: "legislator",
      factionId: faction.id,
    });
    const candidate = await createTestAccount({ role: "candidate" });
    const normalUser = await createTestUser(`normal-${Date.now()}@example.com`);
    testUsers.push(admin, legislator, candidate, normalUser);

    const { data, error } = await adminClient.rpc("get_admin_accounts");

    expect(error).toBeNull();
    const ids = data?.map((account) => account.user_id);
    expect(ids).toContain(admin.id);
    expect(ids).toContain(legislator.id);
    expect(ids).toContain(candidate.id);
    expect(ids).not.toContain(normalUser.id);
  });

  it("メールアドレス・ロール・会派名・確認状態を返す", async () => {
    const faction = await createTestFaction();
    factionIds.push(faction.id);
    const legislator = await createTestAccount({
      role: "legislator",
      factionId: faction.id,
      displayName: "議員テスト",
    });
    testUsers.push(legislator);

    const { data, error } = await adminClient.rpc("get_admin_accounts");
    expect(error).toBeNull();

    const found = data?.find((account) => account.user_id === legislator.id);
    expect(found).toMatchObject({
      email: legislator.email,
      display_name: "議員テスト",
      role: "legislator",
      faction_id: faction.id,
      faction_name: faction.display_name,
    });
    // createTestAccount は確認済みで作る
    expect(found?.email_confirmed_at).toBeTruthy();
    expect(found?.created_at).toBeTruthy();
  });

  it("招待前（未確認）のアカウントは email_confirmed_at が null", async () => {
    const email = `unconfirmed-${Date.now()}@example.com`;
    const { data: created, error: createError } =
      await adminClient.auth.admin.createUser({ email, email_confirm: false });
    expect(createError).toBeNull();
    const userId = created.user?.id ?? "";
    testUsers.push({ id: userId, email, password: "" });
    const { error: profileError } = await adminClient
      .from("admin_profiles")
      .insert({ user_id: userId, role: "candidate", display_name: email });
    expect(profileError).toBeNull();

    const { data, error } = await adminClient.rpc("get_admin_accounts");
    expect(error).toBeNull();

    const found = data?.find((account) => account.user_id === userId);
    expect(found).toBeTruthy();
    expect(found?.email_confirmed_at).toBeNull();
  });

  it("anon クライアントではパーミッションエラーになる", async () => {
    const client = getAnonClient();
    const { error } = await client.rpc("get_admin_accounts");
    expect(error).not.toBeNull();
  });
});
