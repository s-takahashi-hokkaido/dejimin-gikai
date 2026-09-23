import type { NextRequest } from "next/server";
import {
  type BasicAuthConfig,
  isPageSpeedInsightsUA,
  validateBasicAuthHeader,
} from "@dejimin-gikai/shared/auth/basic-auth";

// 純粋関数は packages/shared に集約し、ここからは再エクスポートする
export {
  type BasicAuthConfig,
  createUnauthorizedResponse,
  isHtmlAcceptHeader,
  isPageSpeedInsightsUA,
  parseBasicAuth,
  validateBasicAuthHeader,
} from "@dejimin-gikai/shared/auth/basic-auth";

export function getBasicAuthConfig(): BasicAuthConfig | null {
  const username = process.env.BASIC_AUTH_USER;
  const password = process.env.BASIC_AUTH_PASSWORD;

  if (!username || !password) {
    return null;
  }

  return { username, password };
}

export function isPageSpeedInsights(request: NextRequest): boolean {
  const userAgent = request.headers.get("user-agent") || "";
  return isPageSpeedInsightsUA(userAgent);
}

export function validateBasicAuth(
  request: NextRequest,
  config: BasicAuthConfig
): boolean {
  const authHeader = request.headers.get("authorization");
  return validateBasicAuthHeader(authHeader, config);
}
