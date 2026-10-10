import { InviteAccountForm } from "@/features/admins/client/components/invite-account-form";
import { AccountList } from "@/features/admins/server/components/account-list";
import {
  loadAdminAccounts,
  loadFactionOptions,
} from "@/features/admins/server/loaders/load-accounts";
import { requirePageAccess } from "@/features/auth/server/lib/auth-server";

export default async function AdminsPage() {
  const currentAdmin = await requirePageAccess("/admins");

  const [accounts, factionOptions] = await Promise.all([
    loadAdminAccounts(),
    loadFactionOptions(),
  ]);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-2">アカウント管理</h1>
      <p className="text-gray-600 mb-8">
        運営者・議員・出馬者のアカウントを招待メールで発行します。パスワードは本人が設定するので、運営者は知りません。
      </p>

      {/* 招待セクション */}
      <section className="mb-8 rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">アカウントを招待</h2>
        <InviteAccountForm factionOptions={factionOptions} />
      </section>

      {/* 一覧セクション */}
      <section className="rounded-lg border bg-white p-6">
        <AccountList
          accounts={accounts}
          currentAdminId={currentAdmin.id}
          factionOptions={factionOptions}
        />
      </section>
    </div>
  );
}
