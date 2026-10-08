import { Home, KeyRound, User } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site.config";
import { LogoutButton } from "@/features/auth/client/components/logout-button";
import { requireRoleOrRedirect } from "@/features/auth/server/lib/auth-server";
import { UPDATE_PASSWORD_PATH } from "@/features/auth/shared/utils/auth-paths";
import { ALL_ROLES, ROLE_LABELS } from "@/features/auth/shared/utils/role";
import { NavigationLinks } from "./layout/navigation-links";

export default async function MainLayout({
  children,
}: {
  children: ReactNode;
}) {
  // 認可の入口。middleware はログイン済みかしか見ないため、
  // 管理画面の利用資格（admin_profiles の有無）はここで確認する。
  const admin = await requireRoleOrRedirect(ALL_ROLES);
  return (
    <div className="min-h-dvh bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Home className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {siteConfig.siteName} Admin
                </h1>
              </div>
            </div>

            <div className="flex items-center space-x-2 md:space-x-4">
              <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-700">
                <User className="h-4 w-4" />
                <span className="hidden md:inline">
                  {admin.displayName}
                  <span className="ml-2 text-xs text-gray-500">
                    {ROLE_LABELS[admin.role]}
                  </span>
                </span>
              </div>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-gray-900"
              >
                <Link href={UPDATE_PASSWORD_PATH}>
                  <KeyRound className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">パスワード変更</span>
                </Link>
              </Button>
              <LogoutButton />
            </div>
          </div>

          {/* Navigation */}
          <NavigationLinks role={admin.role} />
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        {/* Main content */}
        <main>{children}</main>
      </div>
    </div>
  );
}
