import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthCard } from "@/features/auth/client/components/auth-card";
import { LoginForm } from "@/features/auth/client/components/login-form";
import { getCurrentAdminUser } from "@/features/auth/server/lib/auth-server";
import { RESET_PASSWORD_PATH } from "@/features/auth/shared/utils/auth-paths";

export default async function LoginPage() {
  // 利用資格のあるユーザーがログイン済みならダッシュボードへ。
  // middleware でリダイレクトすると、資格の無いユーザーが
  // /login と /bills の間でループするため、ここで判定する。
  const admin = await getCurrentAdminUser();
  if (admin) {
    redirect("/bills");
  }

  return (
    <AuthCard title="管理画面ログイン">
      <Suspense fallback={<div>Loading...</div>}>
        <LoginForm />
      </Suspense>

      <p className="mt-4 text-center text-sm">
        <Link
          href={RESET_PASSWORD_PATH}
          className="text-blue-600 hover:underline"
        >
          パスワードをお忘れの方・招待メールの期限が切れた方
        </Link>
      </p>
    </AuthCard>
  );
}
