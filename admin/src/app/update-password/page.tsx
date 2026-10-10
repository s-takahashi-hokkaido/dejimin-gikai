import { UpdatePasswordContent } from "@/features/auth/server/components/update-password-content";

interface UpdatePasswordPageProps {
  searchParams: Promise<{
    token_hash?: string | string[];
    type?: string | string[];
  }>;
}

export default async function UpdatePasswordPage({
  searchParams,
}: UpdatePasswordPageProps) {
  const { token_hash, type } = await searchParams;

  return <UpdatePasswordContent tokenHash={token_hash} type={type} />;
}
