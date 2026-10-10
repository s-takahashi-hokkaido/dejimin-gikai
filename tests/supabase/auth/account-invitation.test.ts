import { afterEach, describe, expect, it } from "vitest";
import { adminClient, cleanupTestUser, getAnonClient } from "../utils";

/**
 * 管理画面のアカウント運用（権限設計 C-4）が頼っている GoTrue の挙動
 *
 * - メールアドレスでのサインアップは before_user_created フック（hook_before_user_created）で拒否する
 * - 匿名ログイン（web の利用者）は通す
 * - 招待は「createUser（未確認）→ 招待メール」。新しいメールアドレスへの招待はユーザーの作成を
 *   伴うのでフックで拒否されるため、必ず先に createUser で作る
 * - メールのリンクの token_hash を verifyOtp で確かめると、その場でセッションが出る。
 *   admin の /update-password はこれでパスワードを設定する
 *
 * CI では SMTP を立てないので、招待・再設定メールの代わりに generateLink で同じ token_hash を作る
 */
describe("アカウントの招待とパスワード再設定（GoTrue）", () => {
  const userIds: string[] = [];

  afterEach(async () => {
    for (const id of userIds.splice(0)) {
      await cleanupTestUser(id);
    }
  });

  /** 招待前の状態（未確認・パスワード無し）でユーザーを作る */
  async function createUnconfirmedUser(email: string): Promise<string> {
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      email_confirm: false,
    });
    if (error || !data.user) {
      throw new Error(`ユーザー作成失敗: ${error?.message}`);
    }
    userIds.push(data.user.id);
    return data.user.id;
  }

  it("メールアドレスでのサインアップは拒否される", async () => {
    const { data, error } = await getAnonClient().auth.signUp({
      email: `signup-${Date.now()}@example.com`,
      password: "signup-password-123",
    });
    if (data.user) userIds.push(data.user.id);

    expect(error?.status).toBe(403);
    expect(data.user).toBeNull();
  });

  it("匿名ログインはできる", async () => {
    const { data, error } = await getAnonClient().auth.signInAnonymously();
    if (data.user) userIds.push(data.user.id);

    expect(error).toBeNull();
    expect(data.user?.is_anonymous).toBe(true);
  });

  it("新しいメールアドレスへの招待（ユーザーの作成を伴う）は拒否される", async () => {
    const { error } = await adminClient.auth.admin.generateLink({
      type: "invite",
      email: `new-invite-${Date.now()}@example.com`,
    });

    expect(error?.status).toBe(403);
  });

  it("未確認で作ったユーザーは、招待の token_hash で確認してパスワードを設定できる", async () => {
    const email = `invite-${Date.now()}@example.com`;
    await createUnconfirmedUser(email);

    const { data: link, error: linkError } =
      await adminClient.auth.admin.generateLink({ type: "invite", email });
    expect(linkError).toBeNull();

    const client = getAnonClient();
    const { data: verified, error: verifyError } = await client.auth.verifyOtp({
      type: "invite",
      token_hash: link.properties?.hashed_token ?? "",
    });
    expect(verifyError).toBeNull();
    expect(verified.session).not.toBeNull();
    expect(verified.user?.email_confirmed_at).toBeTruthy();

    const password = "invited-password-123";
    const { error: updateError } = await client.auth.updateUser({ password });
    expect(updateError).toBeNull();

    const { error: signInError } =
      await getAnonClient().auth.signInWithPassword({ email, password });
    expect(signInError).toBeNull();
  });

  it("確認済みのユーザーには招待を送り直せない", async () => {
    const email = `confirmed-${Date.now()}@example.com`;
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password: "confirmed-password-123",
      email_confirm: true,
    });
    expect(error).toBeNull();
    if (data.user) userIds.push(data.user.id);

    const { error: linkError } = await adminClient.auth.admin.generateLink({
      type: "invite",
      email,
    });
    expect(linkError?.code).toBe("email_exists");
  });

  it("再設定の token_hash で新しいパスワードを設定でき、同じリンクは2度使えない", async () => {
    const email = `recovery-${Date.now()}@example.com`;
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password: "old-password-123",
      email_confirm: true,
    });
    expect(error).toBeNull();
    if (data.user) userIds.push(data.user.id);

    const { data: link, error: linkError } =
      await adminClient.auth.admin.generateLink({ type: "recovery", email });
    expect(linkError).toBeNull();
    const tokenHash = link.properties?.hashed_token ?? "";

    const client = getAnonClient();
    const { error: verifyError } = await client.auth.verifyOtp({
      type: "recovery",
      token_hash: tokenHash,
    });
    expect(verifyError).toBeNull();

    const newPassword = "new-password-456";
    const { error: updateError } = await client.auth.updateUser({
      password: newPassword,
    });
    expect(updateError).toBeNull();

    const { error: reuseError } = await getAnonClient().auth.verifyOtp({
      type: "recovery",
      token_hash: tokenHash,
    });
    expect(reuseError).not.toBeNull();

    const { error: signInError } =
      await getAnonClient().auth.signInWithPassword({
        email,
        password: newPassword,
      });
    expect(signInError).toBeNull();
  });
});
