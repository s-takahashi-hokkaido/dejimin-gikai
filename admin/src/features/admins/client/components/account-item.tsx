"use client";

import { Check, Mail, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { type AdminRole, ROLE_LABELS } from "@/features/auth/shared/utils/role";
import { deleteAccount } from "../../server/actions/delete-account";
import { resendInvitation } from "../../server/actions/resend-invitation";
import { updateAccount } from "../../server/actions/update-account";
import type {
  AccountActionResult,
  AdminAccount,
  FactionOption,
} from "../../shared/types";
import { formatAccountDateTime } from "../../shared/utils/format-account-date-time";
import { DISPLAY_NAME_MAX_LENGTH } from "../../shared/utils/validate-account";
import { FactionSelect } from "./faction-select";
import { RoleSelect } from "./role-select";

type AccountItemProps = {
  account: AdminAccount;
  isCurrentUser: boolean;
  factionOptions: FactionOption[];
};

export function AccountItem({
  account,
  isCurrentUser,
  factionOptions,
}: AccountItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [displayName, setDisplayName] = useState(account.displayName);
  const [role, setRole] = useState<AdminRole>(account.role);
  const [faction, setFaction] = useState<string | null>(account.factionId);

  const isLegislator = role === "legislator";

  /** Server Action を呼び、結果をトーストで知らせる。成功したら true */
  const run = async (
    action: () => Promise<AccountActionResult>,
    successMessage: string,
    failureMessage: string
  ) => {
    setIsSubmitting(true);
    try {
      const result = await action();
      if ("error" in result) {
        toast.error(result.error);
        return false;
      }
      toast.success(successMessage);
      return true;
    } catch (error) {
      console.error(failureMessage, error);
      toast.error(failureMessage);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSave = async () => {
    const saved = await run(
      () =>
        updateAccount({
          id: account.id,
          displayName,
          role,
          factionId: isLegislator ? faction : null,
        }),
      "アカウントを更新しました",
      "アカウントの更新に失敗しました"
    );
    if (saved) {
      setIsEditing(false);
    }
  };

  // 編集を始める時は、最新の一覧の値から入れ直す（前回の編集の値を残さない）
  const handleStartEditing = () => {
    setDisplayName(account.displayName);
    setRole(account.role);
    setFaction(account.factionId);
    setIsEditing(true);
  };

  const handleResend = () =>
    run(
      () => resendInvitation({ id: account.id }),
      `${account.email} に招待メールを送り直しました`,
      "招待メールの再送に失敗しました"
    );

  const handleDelete = () =>
    run(
      () => deleteAccount({ id: account.id }),
      "アカウントを削除しました",
      "アカウントの削除に失敗しました"
    );

  if (isEditing) {
    return (
      <TableRow>
        <TableCell className="min-w-48 align-top">
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={DISPLAY_NAME_MAX_LENGTH}
            disabled={isSubmitting}
            aria-label="表示名"
          />
          <p className="mt-1 text-xs text-gray-500">{account.email}</p>
        </TableCell>
        <TableCell className="min-w-32 align-top">
          <RoleSelect
            value={role}
            onChange={setRole}
            disabled={isSubmitting || isCurrentUser}
          />
          {isCurrentUser && (
            <p className="mt-1 text-xs text-gray-500">
              自分のロールは変更できません
            </p>
          )}
        </TableCell>
        <TableCell className="min-w-48 align-top">
          <FactionSelect
            value={isLegislator ? faction : null}
            options={factionOptions}
            onChange={setFaction}
            disabled={isSubmitting || isCurrentUser || !isLegislator}
            placeholder={isLegislator ? "会派を選択" : "議員のみ"}
          />
        </TableCell>
        <TableCell colSpan={2} />
        <TableCell className="align-top">
          <div className="flex gap-1">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSubmitting}
              aria-label="保存"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditing(false)}
              disabled={isSubmitting}
              aria-label="キャンセル"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="font-medium">{account.displayName}</span>
          {isCurrentUser && <Badge variant="secondary">自分</Badge>}
        </div>
        <p className="text-xs text-gray-500">{account.email}</p>
      </TableCell>
      <TableCell>
        <Badge variant="outline">{ROLE_LABELS[account.role]}</Badge>
      </TableCell>
      <TableCell className="text-gray-600">
        {account.factionName ?? "-"}
      </TableCell>
      <TableCell>
        {account.status === "invited" ? (
          <div>
            <Badge variant="secondary">招待中</Badge>
            <p className="mt-1 text-xs text-gray-500">
              送信: {formatAccountDateTime(account.invitedAt)}
            </p>
          </div>
        ) : (
          <span className="text-sm text-gray-600">有効</span>
        )}
      </TableCell>
      <TableCell className="text-gray-600">
        {formatAccountDateTime(account.lastSignInAt)}
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleStartEditing}
            disabled={isSubmitting}
            aria-label="編集"
            title="編集"
          >
            <Pencil className="h-4 w-4" />
          </Button>

          {account.status === "invited" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResend}
              disabled={isSubmitting}
              aria-label="招待メールを送り直す"
              title="招待メールを送り直す"
            >
              <Mail className="h-4 w-4" />
            </Button>
          )}

          {isCurrentUser ? (
            <Button
              variant="ghost"
              size="sm"
              disabled
              className="text-gray-400"
              aria-label="自分自身は削除できません"
              title="自分自身は削除できません"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isSubmitting}
                  className="text-red-600 hover:text-red-800 hover:bg-red-50"
                  aria-label="削除"
                  title="削除"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>アカウントの削除</AlertDialogTitle>
                  <AlertDialogDescription>
                    「{account.displayName}（{account.email}
                    ）」のアカウントを削除しますか？管理画面に入れなくなり、元に戻せません。これまでの変更履歴は削除後も残ります。閲覧だけにしたい場合は、削除の代わりにロールを出馬者に変えることもできます。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isSubmitting}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {isSubmitting ? "削除中..." : "削除"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
