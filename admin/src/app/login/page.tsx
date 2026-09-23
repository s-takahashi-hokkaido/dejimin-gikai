import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { siteConfig } from "@/config/site.config";
import { LoginForm } from "@/features/auth/client/components/login-form";
import { getCurrentAdminUser } from "@/features/auth/server/lib/auth-server";

export default async function LoginPage() {
  // 利用資格のあるユーザーがログイン済みならダッシュボードへ。
  // middleware でリダイレクトすると、資格の無いユーザーが
  // /login と /bills の間でループするため、ここで判定する。
  const admin = await getCurrentAdminUser();
  if (admin) {
    redirect("/bills");
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            管理者ログイン
          </CardTitle>
          <p className="text-sm text-muted-foreground text-center">
            {siteConfig.siteName} Admin
          </p>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Loading...</div>}>
            <LoginForm />
          </Suspense>

          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              © 2026 {siteConfig.siteName}. All rights reserved.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
