export const MAIN_CATEGORIES = [
  "Buffet tables",
  "Coffee break",
  "Nesting table",
  "Trolleys",
  "Banquet furniture",
] as const;

export type MainCategory = (typeof MAIN_CATEGORIES)[number] | string;

export const UNCATEGORIZED_MAIN = "Uncategorized";

export function normalizeMainCategory(value?: string | null): string {
  const v = (value ?? "").trim();
  if (!v) return UNCATEGORIZED_MAIN;
  const match = MAIN_CATEGORIES.find((m) => m.toLowerCase() === v.toLowerCase());
  return match ?? v;
}
