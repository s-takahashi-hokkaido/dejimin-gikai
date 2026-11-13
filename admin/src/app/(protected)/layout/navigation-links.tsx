"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  type EnabledNavFeatures,
  getVisibleNavItems,
} from "@/features/auth/shared/utils/can-access-page";
import type { AdminRole } from "@/features/auth/shared/utils/role";
import { cn } from "@/lib/utils";

export function NavigationLinks({
  role,
  enabledFeatures,
}: {
  role: AdminRole;
  /** 機能フラグ。環境変数はサーバーでしか読めないので、レイアウトから渡す */
  enabledFeatures: EnabledNavFeatures;
}) {
  const pathname = usePathname();
  const navigationLinks = getVisibleNavItems(role, enabledFeatures);

  return (
    <nav>
      <div className="flex space-x-8">
        {navigationLinks.map((link) => {
          const isActive = pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "inline-flex items-center gap-2 px-1 py-4 text-sm border-b-2 transition-colors",
                isActive
                  ? "border-blue-600 text-blue-600 font-semibold"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium"
              )}
            >
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
