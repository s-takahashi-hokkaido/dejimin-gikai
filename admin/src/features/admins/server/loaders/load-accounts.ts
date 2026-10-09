import "server-only";
import { unstable_noStore as noStore } from "next/cache";
import type { AdminAccount, FactionOption } from "../../shared/types";
import { toAdminAccount } from "../../shared/utils/to-admin-account";
import {
  findAdminAccounts,
  findFactionOptions,
} from "../repositories/admin-repository";

export async function loadAdminAccounts(): Promise<AdminAccount[]> {
  noStore();

  const rows = await findAdminAccounts();

  return rows
    .map(toAdminAccount)
    .filter((account): account is AdminAccount => account !== null);
}

export async function loadFactionOptions(): Promise<FactionOption[]> {
  noStore();

  const rows = await findFactionOptions();

  return rows.map((faction) => ({
    id: faction.id,
    name: faction.display_name,
    isActive: faction.is_active,
  }));
}
