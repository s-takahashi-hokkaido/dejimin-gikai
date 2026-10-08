import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AccountItem } from "../../client/components/account-item";
import type { AdminAccount, FactionOption } from "../../shared/types";

type AccountListProps = {
  accounts: AdminAccount[];
  currentAdminId: string;
  factionOptions: FactionOption[];
};

export function AccountList({
  accounts,
  currentAdminId,
  factionOptions,
}: AccountListProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">
        アカウント一覧 ({accounts.length}件)
      </h2>

      {accounts.length === 0 ? (
        <p className="text-gray-500">アカウントがありません</p>
      ) : (
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>表示名・メールアドレス</TableHead>
                <TableHead>ロール</TableHead>
                <TableHead>所属会派</TableHead>
                <TableHead>状態</TableHead>
                <TableHead>最終ログイン</TableHead>
                <TableHead className="w-[140px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <AccountItem
                  key={account.id}
                  account={account}
                  isCurrentUser={account.id === currentAdminId}
                  factionOptions={factionOptions}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
