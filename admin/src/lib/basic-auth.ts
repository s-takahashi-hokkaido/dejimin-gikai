import {
  type BasicAuthConfig,
  isHtmlAcceptHeader,
  validateBasicAuthHeader,
} from "@dejimin-gikai/shared/auth/basic-auth";
import type { NextRequest } from "next/server";

export type { BasicAuthConfig };

/**
 * 管理画面のBasic認証設定を取得する
 *
 * 議員・出馬者に共通で周知する1組。web 側の Basic 認証とは目的も期間も違うため
 * 環境変数を分けている（web: 公開前の目隠し / admin: 常設の入口フィルタ）。
 * 未設定なら Basic 認証は無効（ローカル開発で毎回入力させないため）。
 */
export function getAdminBasicAuthConfig(): BasicAuthConfig | null {
  const username = process.env.ADMIN_BASIC_AUTH_USER;
  const password = process.env.ADMIN_BASIC_AUTH_PASSWORD;

  if (!username || !password) {
    return null;
  }

  return { username, password };
}

/** 画面遷移のリクエストかどうか */
export function isHtmlNavigation(request: NextRequest): boolean {
  return isHtmlAcceptHeader(request.headers.get("accept") || "");
}

export function validateBasicAuth(
  request: NextRequest,
  config: BasicAuthConfig
): boolean {
  return validateBasicAuthHeader(request.headers.get("authorization"), config);
}
