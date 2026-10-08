import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { siteConfig } from "@/config/site.config";

type AuthCardProps = {
  title: string;
  description?: ReactNode;
  children: ReactNode;
};

/** ログイン前の画面（ログイン・パスワード再設定）の枠 */
export function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {title}
          </CardTitle>
          <p className="text-sm text-muted-foreground text-center">
            {siteConfig.siteName} Admin
          </p>
        </CardHeader>
        <CardContent>
          {description && (
            <div className="mb-4 space-y-2 text-sm text-gray-600">
              {description}
            </div>
          )}

          {children}

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
