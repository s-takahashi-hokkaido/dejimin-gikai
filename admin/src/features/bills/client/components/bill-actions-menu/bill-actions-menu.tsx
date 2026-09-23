"use client";

import {
  BarChart3,
  Edit,
  FileText,
  MessageCircle,
  MoreVertical,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { canAccessPage } from "@/features/auth/shared/utils/can-access-page";
import type { AdminRole } from "@/features/auth/shared/utils/role";
import { DeleteBillButton } from "./delete-bill-button";
import { DuplicateBillButton } from "./duplicate-bill-button";

interface BillActionsMenuProps {
  billId: string;
  billName: string;
  role: AdminRole;
}

export function BillActionsMenu({
  billId,
  billName,
  role,
}: BillActionsMenuProps) {
  // 行き先の画面に入れるものだけを出す。判定は画面のガードと同じ canAccessPage
  const links = [
    { href: `/bills/${billId}/edit`, icon: Edit, label: "基本情報" },
    {
      href: `/bills/${billId}/contents/edit`,
      icon: FileText,
      label: "コンテンツ",
    },
    {
      href: `/bills/${billId}/interview`,
      icon: MessageCircle,
      label: "インタビュー設定",
    },
    {
      href: `/bills/${billId}/reports`,
      icon: BarChart3,
      label: "レポート一覧",
    },
    {
      href: `/bills/${billId}/topic-analysis`,
      icon: Sparkles,
      label: "トピック解析",
    },
  ].filter((link) => canAccessPage(role, link.href));

  // 複製・削除は運営者のみ
  const canManage = role === "admin";

  if (links.length === 0 && !canManage) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1" align="end">
        <div className="flex flex-col">
          {links.map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href}>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
              >
                <Icon className="h-4 w-4 mr-2" />
                {label}
              </Button>
            </Link>
          ))}
          {canManage && (
            <>
              <div className="my-1 border-t" />
              <DuplicateBillButton billId={billId} billName={billName} />
              <DeleteBillButton billId={billId} billName={billName} />
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
