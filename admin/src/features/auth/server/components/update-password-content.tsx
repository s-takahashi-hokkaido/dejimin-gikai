import "server-only";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AuthCard } from "../../client/components/auth-card";
import { UpdatePasswordForm } from "../../client/components/update-password-form";
import { LOGIN_PATH, RESET_PASSWORD_PATH } from "../../shared/utils/auth-paths";
import { resolveUpdatePasswordMode } from "../../shared/utils/email-link";
import { getCurrentAdminUser } from "../lib/auth-server";

type UpdatePasswordContentProps = {
  tokenHash: string | string[] | undefined;
  type: string | string[] | undefined;
};

/**
 * 招待・パスワード再設定メールのリンク先。新しいパスワードを設定する
 *
 * 開いただけではリンクのトークンを使わない。送信した時に確かめる
 * （メールのリンクを先読みするセキュリティ製品にトークンを消費されないように）。
 * リンクが無い場合は、ログイン中の利用者のパスワード変更として扱う。
 */
export async function UpdatePasswordContent({
  tokenHash,
  type,
}: UpdatePasswordContentProps) {
  // ログイン状態はリンクが無い時だけ使うので、その時だけ確かめる
  const hasSession =
    tokenHash === undefined && (await getCurrentAdminUser()) !== null;
  const mode = resolveUpdatePasswordMode({ tokenHash, type, hasSession });

  switch (mode.kind) {
    case "invite":
      return (
        <AuthCard
          title="パスワードの設定"
          description={
            <p>
              管理画面に招待されたアカウントのパスワードを設定してください。設定すると、そのままログインした状態になります。
            </p>
          }
        >
          <UpdatePasswordForm mode={mode} />
        </AuthCard>
      );
    case "recovery":
      return (
        <AuthCard
          title="パスワードの再設定"
          description={<p>新しいパスワードを設定してください。</p>}
        >
          <UpdatePasswordForm mode={mode} />
        </AuthCard>
      );
    case "change":
      return (
        <AuthCard
          title="パスワードの変更"
          description={<p>新しいパスワードを設定してください。</p>}
        >
          <UpdatePasswordForm mode={mode} />
          <p className="mt-4 text-center text-sm">
            <Link href="/bills" className="text-blue-600 hover:underline">
              管理画面に戻る
            </Link>
          </p>
        </AuthCard>
      );
    case "invalid":
      return (
        <AuthCard
          title="リンクを確認できません"
          description={
            <>
              <p>リンクが正しくないか、ログインしていません。</p>
              <p>
                パスワードを再設定する場合は、もう一度再設定のメールを申し込んでください。招待メールのリンクの期限が切れた場合は、運営者に招待メールの再送を依頼してください。
              </p>
            </>
          }
        >
          <div className="space-y-2">
            <Button asChild className="w-full">
              <Link href={RESET_PASSWORD_PATH}>再設定のメールを申し込む</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href={LOGIN_PATH}>ログイン画面へ</Link>
            </Button>
          </div>
        </AuthCard>
      );
  }
}
