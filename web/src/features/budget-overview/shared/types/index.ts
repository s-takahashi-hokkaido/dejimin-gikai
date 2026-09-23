import type { Database } from "@dejimin-gikai/supabase";

export type BudgetOverview =
  Database["public"]["Tables"]["budget_overviews"]["Row"];
export type BudgetTheme = Database["public"]["Tables"]["budget_themes"]["Row"];
export type BudgetInitiative =
  Database["public"]["Tables"]["budget_initiatives"]["Row"];

export type BudgetOverviewWithThemes = BudgetOverview & {
  themes: (BudgetTheme & { initiatives: BudgetInitiative[] })[];
};
