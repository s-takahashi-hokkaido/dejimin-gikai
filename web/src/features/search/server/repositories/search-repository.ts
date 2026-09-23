import "server-only";
import { createAdminClient } from "@dejimin-gikai/supabase";
import type {
  BillSearchResult,
  QuestionSearchResult,
  BudgetSearchResult,
} from "../../shared/types/search-types";

export async function searchBills(query: string): Promise<BillSearchResult[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bill_contents")
    .select(
      `
      bill_id,
      title,
      summary,
      bills!inner (
        id,
        publish_status,
        published_at,
        council_sessions (name),
        bills_tags (
          tags (label)
        )
      )
    `
    )
    .eq("difficulty_level", "normal")
    .or(`title.ilike.%${query}%,summary.ilike.%${query}%`)
    .limit(50);

  if (error) throw new Error(`Failed to search bills: ${error.message}`);

  return (data ?? [])
    .filter((row) => {
      const bill = row.bills as { publish_status: string };
      return bill.publish_status === "published";
    })
    .map((row) => {
      const bill = row.bills as {
        id: string;
        published_at: string | null;
        council_sessions: { name: string } | null;
        bills_tags: Array<{ tags: { label: string } | null }>;
      };
      return {
        id: bill.id,
        title: row.title,
        summary: row.summary,
        session: bill.council_sessions?.name ?? "",
        publishedAt: bill.published_at,
        tags: bill.bills_tags
          .map((bt) => bt.tags?.label)
          .filter((l): l is string => l != null),
      };
    });
}

export async function searchGeneralQuestions(
  query: string
): Promise<QuestionSearchResult[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("general_questions")
    .select(
      `
      id,
      questioner_name,
      summary,
      topics,
      council_sessions (name)
    `
    )
    .eq("publish_status", "published")
    .or(`summary.ilike.%${query}%,questioner_name.ilike.%${query}%`)
    .limit(50);

  if (error) throw new Error(`Failed to search questions: ${error.message}`);

  return (data ?? []).map((row) => {
    const topics = Array.isArray(row.topics)
      ? (row.topics as Array<{ title: string }>)
      : [];
    const session =
      (row.council_sessions as { name: string } | null)?.name ?? "";
    return {
      id: row.id,
      questioner: row.questioner_name,
      topics: topics.map((t) => t.title),
      summary: row.summary,
      session,
    };
  });
}

export async function searchBudgets(
  query: string
): Promise<BudgetSearchResult[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("budget_overviews")
    .select(
      `
      id,
      department_name,
      department_slug,
      direction,
      council_sessions!inner (name, slug)
    `
    )
    .eq("publish_status", "published")
    .or(`department_name.ilike.%${query}%,direction.ilike.%${query}%`)
    .limit(50);

  if (error) throw new Error(`Failed to search budgets: ${error.message}`);

  return (data ?? []).map((row) => {
    const session = row.council_sessions as { name: string; slug: string };
    return {
      id: row.id,
      departmentName: row.department_name,
      direction: row.direction,
      session: session?.name ?? "",
      sessionSlug: session?.slug ?? "",
      departmentSlug: row.department_slug,
    };
  });
}
