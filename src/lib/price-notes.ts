export const units = ["g", "kg", "ml", "L", "個", "枚", "箱"] as const;
export type PriceRecord = { id: string; store: string; price: number; shipping: number; quantity: number; online: boolean; date: string; createdAt: string };
export type PriceProduct = { id: string; name: string; category: string; unit: string; records: PriceRecord[] };
export function parsePriceInput(input: unknown) {
  if (!input || typeof input !== "object") throw new Error("入力内容を確認してください。");
  const b = input as Record<string, unknown>;
  const text = (key: string, limit: number) => {
    if (typeof b[key] !== "string" || !b[key].trim() || b[key].trim().length > limit) throw new Error("商品名・お店・購入日を確認してください。");
    return b[key].trim();
  };
  const name = text("name", 120), store = text("store", 120), date = text("date", 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new Error("有効な購入日を入力してください。");
  if (b.category !== "食品" && b.category !== "日用品") throw new Error("カテゴリーを選択してください。");
  if (!units.includes(b.unit as typeof units[number])) throw new Error("単位を選択してください。");
  if (typeof b.online !== "boolean") throw new Error("購入先を選択してください。");
  const { price, shipping, quantity } = b;
  if (typeof price !== "number" || !Number.isInteger(price) || price <= 0 || price > 100000000 || typeof shipping !== "number" || !Number.isInteger(shipping) || shipping < 0 || shipping > 100000000) throw new Error("価格と送料は有効な整数で入力してください。");
  if (typeof quantity !== "number" || !Number.isFinite(quantity) || quantity <= 0 || quantity > 1000000) throw new Error("内容量は0より大きい数で入力してください。");
  const multiplier = b.unit === "kg" || b.unit === "L" ? 1000 : 1;
  return { name, store, date, category: b.category, unit: b.unit === "kg" ? "g" : b.unit === "L" ? "ml" : b.unit as string, price, shipping, quantity: quantity * multiplier, online: b.online };
}
export const unitPrice = (r: Pick<PriceRecord, "price" | "shipping" | "quantity">) => (r.price + r.shipping) / r.quantity;
export function cheapest(records: PriceRecord[]) {
  return [...records].sort((a, b) => unitPrice(a) - unitPrice(b) || b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))[0];
}
export function unitLabel(unit: string, record: PriceRecord) {
  const base = unit === "g" || unit === "ml" ? 100 : 1;
  return `${base}${unit} あたり ¥${(unitPrice(record) * base).toLocaleString("ja-JP", { maximumFractionDigits: 1 })}`;
}
