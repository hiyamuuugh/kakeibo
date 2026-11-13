export const csvImportSources = [
  { id: "paypay", label: "PayPay" },
  { id: "paypay-card", label: "PayPayカード" },
  { id: "rakuten", label: "楽天カード" },
  { id: "saison", label: "セゾンカード" },
  { id: "mufg", label: "三菱UFJ銀行" },
  { id: "smbc", label: "三井住友銀行" },
] as const;
export type CsvImportSource = (typeof csvImportSources)[number]["id"];
export const isCsvImportSource = (value: unknown): value is CsvImportSource =>
  csvImportSources.some(source => source.id === value);
