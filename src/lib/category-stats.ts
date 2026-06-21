interface CategoryLike {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface TransactionLike {
  amount: number;
  categoryId: string | null;
  category: CategoryLike | null;
}

export interface CategoryStat {
  id: string;
  name: string;
  color: string;
  icon: string;
  total: number;
  count: number;
}

interface BuildCategoryStatsOptions {
  fallbackId: string;
  fallbackName: string;
  fallbackColor: string;
  fallbackIcon: string;
  useAbsoluteAmount?: boolean;
  allowedCategoryNames?: readonly string[];
}

export const buildCategoryStats = (
  transactions: TransactionLike[],
  options: BuildCategoryStatsOptions,
): CategoryStat[] => {
  const byCategory = new Map<string, CategoryStat>();

  for (const t of transactions) {
    const categoryAllowed =
      t.category !== null &&
      (options.allowedCategoryNames === undefined ||
        options.allowedCategoryNames.includes(t.category.name));
    const key = categoryAllowed ? t.categoryId ?? options.fallbackId : options.fallbackId;
    const amount = options.useAbsoluteAmount ? Math.abs(t.amount) : t.amount;
    const existing = byCategory.get(key);
    if (existing) {
      existing.total += amount;
      existing.count += 1;
      continue;
    }

    byCategory.set(key, {
      id: key,
      name: categoryAllowed ? t.category?.name ?? options.fallbackName : options.fallbackName,
      color: categoryAllowed ? t.category?.color ?? options.fallbackColor : options.fallbackColor,
      icon: categoryAllowed ? t.category?.icon ?? options.fallbackIcon : options.fallbackIcon,
      total: amount,
      count: 1,
    });
  }

  return Array.from(byCategory.values()).sort((a, b) => b.total - a.total);
};
