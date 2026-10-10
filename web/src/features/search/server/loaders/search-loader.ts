import "server-only";
import {
  searchBills,
  searchGeneralQuestions,
} from "../repositories/search-repository";
import type { SearchResults } from "../../shared/types/search-types";

export async function loadSearchResults(query: string): Promise<SearchResults> {
  const [bills, questions] = await Promise.all([
    searchBills(query),
    searchGeneralQuestions(query),
  ]);
  return { bills, questions };
}
