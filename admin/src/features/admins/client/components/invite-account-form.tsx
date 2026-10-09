"use client";

import { Send } from "lucide-react";
import type { FormEvent } from "react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ADMIN_ROLES,
  type AdminRole,
  ROLE_LABELS,
} from "@/features/auth/shared/utils/role";
import { inviteAccount } from "../../server/actions/invite-account";
import type { FactionOption } from "../../shared/types";
import { DISPLAY_NAME_MAX_LENGTH } from "../../shared/utils/validate-account";
import { FactionSelect } from "./faction-select";
import { ROLE_DESCRIPTIONS, RoleSelect } from "./role-select";

type InviteAccountFormProps = {
  factionOptions: FactionOption[];
};

export function InviteAccountForm({ factionOptions }: InviteAccountFormProps) {
  const emailId = useId();
  const displayNameId = useId();
  const roleId = useId();
  const factionId = useId();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  // 権限の大きさが違うので、既定値を置かずに毎回選んでもらう
  const [role, setRole] = useState<AdminRole | "">("");
  const [faction, setFaction] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLegislator = role === "legislator";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await inviteAccount({
        email,
        displayName,
        role,
        factionId: isLegislator ? faction : null,
      });

      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(`${email.trim()} に招待メールを送りました`);
        setEmail("");
        setDisplayName("");
        setRole("");
        setFaction(null);
      }
    } catch (error) {
      console.error("Invite account error:", error);
      toast.error("招待に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={emailId}>メールアドレス</Label>
          <Input
            id={emailId}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="giin@example.com"
            disabled={isSubmitting}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={displayNameId}>表示名</Label>
          <Input
            id={displayNameId}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="例: 札幌 太郎"
            maxLength={DISPLAY_NAME_MAX_LENGTH}
            disabled={isSubmitting}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={roleId}>ロール</Label>
          <RoleSelect
            id={roleId}
            value={role}
            onChange={setRole}
            disabled={isSubmitting}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={factionId}>所属会派（議員のみ）</Label>
          <FactionSelect
            id={factionId}
            value={isLegislator ? faction : null}
            options={factionOptions}
            onChange={setFaction}
            disabled={isSubmitting || !isLegislator}
            placeholder={isLegislator ? "会派を選択" : "議員のみ選択できます"}
          />
        </div>
      </div>

      <ul className="space-y-1 text-xs text-gray-600">
        {ADMIN_ROLES.map((roleOption) => (
          <li key={roleOption}>
            <span className="font-medium">{ROLE_LABELS[roleOption]}</span>:{" "}
            {ROLE_DESCRIPTIONS[roleOption]}
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-gray-600">
          招待メールのリンクから、本人がパスワードを設定します（リンクの有効期限は24時間）。招待は本人確認をしたうえで、議会事務局を通すか公式に公開されている連絡先に送ってください。
        </p>
        <Button type="submit" disabled={isSubmitting} className="shrink-0">
          <Send className="h-4 w-4" />
          {isSubmitting ? "送信中..." : "招待メールを送る"}
        </Button>
      </div>
    </form>
  );
}
