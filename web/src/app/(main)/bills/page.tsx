import type { Metadata } from "next";
import { siteConfig } from "@/config/site.config";
import { BillsListPage } from "@/features/bills/server/components/bills-list-page";
import type { BillsListSearchParams } from "@/features/bills/shared/utils/parse-bills-list-params";

export const metadata: Metadata = {
  title: `議案を検索する | ${siteConfig.siteName}`,
  description: `${siteConfig.councilName}に上程された議案を、審議状況やカテゴリから探せます。`,
};

type Props = {
  searchParams: Promise<BillsListSearchParams>;
};

export default async function BillsPage({ searchParams }: Props) {
  return <BillsListPage searchParams={await searchParams} />;
}
