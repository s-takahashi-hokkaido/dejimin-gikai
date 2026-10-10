export type SearchTab = "all" | "bills" | "questions";

export type BillSearchResult = {
  id: string;
  title: string;
  summary: string | null;
  session: string;
  publishedAt: string | null;
  tags: string[];
};

export type QuestionSearchResult = {
  id: string;
  questioner: string;
  topics: string[];
  summary: string | null;
  session: string;
};

export type SearchResults = {
  bills: BillSearchResult[];
  questions: QuestionSearchResult[];
};
