export interface CategoryOption {
  id: string;
  name: string;
  type?: string;
  color?: string;
  icon?: string;
}

export type CategoryKind = "expense" | "income";

export const EXPENSE_CATEGORY_ORDER = [
  "食費",
  "日用品",
  "交通費",
  "娯楽",
  "医療",
  "固定費",
  "その他",
  "未分類",
];

export const INCOME_CATEGORY_ORDER = ["給料", "補助金", "その他", "未分類"];

const INCOME_CATEGORY_NAMES = new Set(INCOME_CATEGORY_ORDER);
const UNCATEGORIZED = "未分類";

const getOrderIndex = (name: string, order: string[]) => {
  const index = order.indexOf(name);
  return index === -1 ? order.length : index;
};

export const isIncomeCategory = (category: CategoryOption) =>
  category.type === "income" || (!category.type && INCOME_CATEGORY_NAMES.has(category.name));

export const isExpenseCategory = (category: CategoryOption) =>
  category.type === "expense" || (!category.type && !INCOME_CATEGORY_NAMES.has(category.name));

export const sortCategories = (categories: CategoryOption[], kind: CategoryKind) => {
  const order = kind === "income" ? INCOME_CATEGORY_ORDER : EXPENSE_CATEGORY_ORDER;

  return [...categories].sort((a, b) => {
    const byOrder = getOrderIndex(a.name, order) - getOrderIndex(b.name, order);
    if (byOrder !== 0) return byOrder;
    return a.name.localeCompare(b.name, "ja");
  });
};

export const getCategoriesByKind = (
  categories: CategoryOption[],
  kind: CategoryKind
) => {
  const filtered =
    kind === "income"
      ? categories.filter(isIncomeCategory)
      : categories.filter(isExpenseCategory);

  return sortCategories(filtered, kind);
};

export const getChartCategoryNames = (
  totals: Map<string, number>,
  kind: CategoryKind
) => {
  if (kind === "income") {
    return [...INCOME_CATEGORY_ORDER];
  }

  const extras = [...totals.entries()]
    .filter(([name]) => !EXPENSE_CATEGORY_ORDER.includes(name) && name !== UNCATEGORIZED)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);

  return [
    ...EXPENSE_CATEGORY_ORDER.filter((name) => name !== UNCATEGORIZED),
    ...extras,
    UNCATEGORIZED,
  ];
};
