"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ADMIN_ROLES,
  type AdminRole,
  ROLE_LABELS,
} from "@/features/auth/shared/utils/role";

/** 招待するときに選ぶロールの説明（権限設計 §4 の権限マトリクスの要約） */
export const ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
  admin: "すべての操作（アカウントの発行・公開設定・マスタの管理を含む）",
  legislator:
    "議案の内容の修正、自分の会派の見解の編集、インタビュー結果の閲覧",
  candidate: "議案一覧とインタビュー結果の閲覧のみ",
};

type RoleSelectProps = {
  id?: string;
  value: AdminRole | "";
  onChange: (value: AdminRole) => void;
  disabled?: boolean;
};

export function RoleSelect({ id, value, onChange, disabled }: RoleSelectProps) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as AdminRole)}
      disabled={disabled}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder="ロールを選択" />
      </SelectTrigger>
      <SelectContent>
        {ADMIN_ROLES.map((role) => (
          <SelectItem key={role} value={role}>
            {ROLE_LABELS[role]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
