import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  adminClient,
  createTestAccount,
  createTestAdminUser,
  createTestFaction,
  createTestUser,
  cleanupTestFaction,
  cleanupTestUser,
  getAnonClient,
  getAuthenticatedClient,
  type TestUser,
} from "../utils";

/**
 * is_admin() は Storage（議案サムネイル）のポリシーが使う。
 * ロールの正は admin_profiles なので、JWT の app_metadata ではなく admin_profiles で判定する
 */
describe("is_admin() 関数", () => {
  let adminUser: TestUser;
  let legislator: TestUser;
  let normalUser: TestUser;
  let factionId: string;

  beforeEach(async () => {
    const faction = await createTestFaction();
    factionId = faction.id;
    adminUser = await createTestAdminUser();
    legislator = await createTestAccount({ role: "legislator", factionId });
    normalUser = await createTestUser();
  });

  afterEach(async () => {
    await cleanupTestUser(adminUser.id);
    await cleanupTestUser(legislator.id);
    await cleanupTestUser(normalUser.id);
    await cleanupTestFaction(factionId);
  });

  it("admin ロールのユーザーで認証すると true を返す", async () => {
    const client = await getAuthenticatedClient(
      adminUser.email,
      adminUser.password
    );
    const { data, error } = await client.rpc("is_admin");
    expect(error).toBeNull();
    expect(data).toBe(true);
  });

  it("議員ロールのユーザーで認証すると false を返す", async () => {
    const client = await getAuthenticatedClient(
      legislator.email,
      legislator.password
    );
    const { data, error } = await client.rpc("is_admin");
    expect(error).toBeNull();
    expect(data).toBe(false);
  });

  it("ロールを議員に変えると、ログインし直さなくても false になる", async () => {
    const client = await getAuthenticatedClient(
      adminUser.email,
      adminUser.password
    );
    const { error: updateError } = await adminClient
      .from("admin_profiles")
      .update({ role: "legislator", faction_id: factionId })
      .eq("user_id", adminUser.id);
    expect(updateError).toBeNull();

    const { data, error } = await client.rpc("is_admin");
    expect(error).toBeNull();
    expect(data).toBe(false);
  });

  it("app_metadata.roles に admin があっても admin_profiles が無ければ false を返す", async () => {
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      normalUser.id,
      { app_metadata: { roles: ["admin"] } }
    );
    expect(updateError).toBeNull();

    const client = await getAuthenticatedClient(
      normalUser.email,
      normalUser.password
    );
    const { data, error } = await client.rpc("is_admin");
    expect(error).toBeNull();
    expect(data).toBe(false);
  });

  it("anon クライアントでは false を返す", async () => {
    const client = getAnonClient();
    const { data, error } = await client.rpc("is_admin");
    expect(error).toBeNull();
    expect(data).toBe(false);
  });
});
