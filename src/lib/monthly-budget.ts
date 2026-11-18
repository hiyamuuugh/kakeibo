export interface MonthlyBudgetPlan {
  version: 1;
  totalAmount: number | null;
  categories: { categoryId: string; amount: number }[];
}
export const emptyMonthlyBudget = (): MonthlyBudgetPlan => ({ version: 1, totalAmount: null, categories: [] });
export const budgetScope = (memberId: string | null) => memberId ? `member:${memberId}` : "family";
const validAmount = (amount: unknown): amount is number => typeof amount === "number" && Number.isInteger(amount) && amount >= 0 && amount <= 2147483647;
export function parseMonthlyBudget(value: unknown): MonthlyBudgetPlan {
  if (!value || typeof value !== "object") throw new Error("予算の入力内容を確認してください。");
  const data = value as Record<string, unknown>;
  if (data.version !== 1 || (data.totalAmount !== null && !validAmount(data.totalAmount)) || !Array.isArray(data.categories) || data.categories.length > 200) throw new Error("予算は0以上の整数（円）で入力してください。");
  const seen = new Set<string>();
  const categories = data.categories.map((row: unknown) => {
    if (!row || typeof row !== "object") throw new Error("カテゴリ予算を確認してください。");
    const entry = row as Record<string, unknown>;
    if (typeof entry.categoryId !== "string" || !entry.categoryId || entry.categoryId.length > 120 || seen.has(entry.categoryId) || !validAmount(entry.amount)) throw new Error("カテゴリ予算を確認してください。");
    seen.add(entry.categoryId);
    return { categoryId: entry.categoryId, amount: entry.amount };
  });
  return { version: 1, totalAmount: data.totalAmount as number | null, categories };
}
export function budgetProgress(spent: number, budget: number) {
  return { spent, budget, remaining: budget - spent, over: spent > budget, percent: budget > 0 ? Math.round(spent / budget * 100) : null, barPercent: budget > 0 ? Math.min(100, spent / budget * 100) : spent > 0 ? 100 : 0 };
}
export function compareMonthlyBudget(plan: MonthlyBudgetPlan, spent: number, categories: { id: string; total: number }[]) {
  const categoryBudgetTotal = plan.categories.reduce((sum, row) => sum + row.amount, 0);
  const limit = plan.totalAmount ?? (plan.categories.length ? categoryBudgetTotal : null);
  const limits = new Map(plan.categories.map(row => [row.categoryId, row.amount]));
  return {
    overall: limit === null ? null : budgetProgress(spent, limit),
    totalSource: plan.totalAmount === null ? "categories" as const : "total" as const,
    categoryBudgetTotal,
    categories: plan.categories.map(row => ({ categoryId: row.categoryId, ...budgetProgress(categories.find(category => category.id === row.categoryId)?.total ?? 0, row.amount) })),
    unbudgetedSpent: categories.filter(row => !limits.has(row.id)).reduce((sum, row) => sum + row.total, 0),
  };
}

/** Budget inputs use 万円; stored/API amounts remain integer yen. */
export const budgetYenToManInput = (yen: number) => String(yen / 10000);
export function budgetManInputToYen(value: string): number {
  if (!/^(?:\d+(?:\.\d{0,4})?|\.\d{1,4})$/.test(value)) throw new Error("予算は0以上の万円単位で、小数点以下4桁まで入力してください。");
  const [whole, fraction = ""] = value.split(".");
  const yen = Number(whole || "0") * 10000 + Number(fraction.padEnd(4, "0"));
  if (!Number.isSafeInteger(yen) || yen > 2147483647) throw new Error("予算は214748.3647万円以下で入力してください。");
  return yen;
}
