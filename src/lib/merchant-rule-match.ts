import { normalize } from "@/lib/normalize";

export interface MerchantRuleLike {
  merchant: string;
  categoryId: string;
}

export const findMatchingRuleCategoryId = (
  text: string,
  rules: MerchantRuleLike[]
) => {
  const normalizedText = normalize(text);
  const hit = rules.find((rule) => {
    const key = normalize(rule.merchant);
    return key.length > 0 && normalizedText.includes(key);
  });

  return hit?.categoryId ?? null;
};
