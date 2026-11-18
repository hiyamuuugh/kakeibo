import { describe, expect, it } from "vitest";
import { budgetProgress, budgetScope, compareMonthlyBudget, emptyMonthlyBudget, parseMonthlyBudget } from "./monthly-budget";
describe("recurring monthly budgets", () => {
  it("keeps unset and zero budgets distinct", () => {
    expect(compareMonthlyBudget(emptyMonthlyBudget(), 100, []).overall).toBeNull();
    expect(budgetProgress(100, 0)).toMatchObject({ over: true, remaining: -100, percent: null, barPercent: 100 });
    expect(budgetProgress(0, 0)).toMatchObject({ over: false, remaining: 0, percent: null, barPercent: 0 });
  });
  it("includes unbudgeted expenses in the whole-month comparison", () => {
    const plan = parseMonthlyBudget({ version: 1, totalAmount: null, categories: [{ categoryId: "food", amount: 20000 }] });
    const result = compareMonthlyBudget(plan, 25000, [{ id: "food", total: 15000 }, { id: "other", total: 10000 }]);
    expect(result.overall).toMatchObject({ budget: 20000, over: true, percent: 125, barPercent: 100 });
    expect(result.categories[0]).toMatchObject({ over: false, remaining: 5000 });
    expect(result.unbudgetedSpent).toBe(10000);
  });
  it("uses explicit overall limit and retains categories with no spending", () => {
    const result = compareMonthlyBudget({ version: 1, totalAmount: 0, categories: [{ categoryId: "food", amount: 20000 }] }, 100, []);
    expect(result.overall?.budget).toBe(0);
    expect(result.categories[0].spent).toBe(0);
    expect(budgetScope("a")).not.toBe(budgetScope("b"));
    expect(budgetScope(null)).toBe("family");
  });
  it.each([-1, 1.5, Infinity, NaN, "100", 2147483648])("rejects invalid amounts: %s", amount => {
    expect(() => parseMonthlyBudget({ version: 1, totalAmount: amount, categories: [] })).toThrow();
  });
  it("rejects duplicates and normalizes an allowed saved plan", () => {
    expect(() => parseMonthlyBudget({ version: 1, totalAmount: null, categories: [{ categoryId: "a", amount: 1 }, { categoryId: "a", amount: 2 }] })).toThrow();
    expect(parseMonthlyBudget({ ...emptyMonthlyBudget(), extra: true })).toEqual(emptyMonthlyBudget());
  });
});
