import { normalize } from "@/lib/normalize";

export interface MerchantRuleLike {
  merchant: string;
  categoryId: string;
  category?: { type: string } | null;
}

export const findMatchingRuleCategoryId = (
  text: string,
  rules: MerchantRuleLike[],
  amount?: number
) => {
  const normalizedText = normalize(text);
  const expectedType = amount === undefined ? null : amount < 0 ? "income" : "expense";
  const hit = rules.find((rule) => {
    const key = normalize(rule.merchant);
    const categoryType = rule.category?.type;
    return key.length > 0 && normalizedText.includes(key) && (!expectedType || !categoryType || categoryType === expectedType);
  });

  return hit?.categoryId ?? null;
};
