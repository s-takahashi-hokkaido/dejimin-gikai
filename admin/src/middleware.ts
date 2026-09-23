import { createUnauthorizedResponse } from "@dejimin-gikai/shared/auth/basic-auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  getAdminBasicAuthConfig,
  isHtmlNavigation,
  validateBasicAuth,
} from "@/lib/basic-auth";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // 1層目: 全員共通のBasic認証
  //
  // HTMLナビゲーションのみを対象にする。admin は自分自身のAPIを
  // Bearer(REVALIDATE_SECRET)で呼んでいるため、全リクエストを challenge すると
  // トピック分析などのサーバー間通信が 401 で壊れる。
  const basicAuthConfig = getAdminBasicAuthConfig();
  if (
    basicAuthConfig &&
    isHtmlNavigation(request) &&
    !validateBasicAuth(request, basicAuthConfig)
  ) {
    return createUnauthorizedResponse("Admin");
  }

  const { supabaseResponse, user } = await updateSession(request);

  // ログイン画面は常にアクセス可能
  if (request.nextUrl.pathname === "/login") {
    return supabaseResponse;
  }

  // トピック分析の内部フェーズAPIは、サーバー間でBearer(REVALIDATE_SECRET)を
  // 使って自分自身を呼ぶためセッションCookieを持たない。
  // ルート側で verifyInternalAuth による検証を行うので、ここでは素通しする。
  if (request.nextUrl.pathname.startsWith("/api/topic-analysis/phases/")) {
    return supabaseResponse;
  }

  // 2層目: 個別ログイン。ここでは「ログイン済みか」だけを見る。
  //
  // ロール判定は middleware では行わない。matcher の設定漏れがそのまま
  // 権限漏れになるのを避けるため、認可は (protected)/layout.tsx と
  // 各ページ・Server Action で admin_profiles を見て判定する。
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
