export type PredictionSettings = { lookbackMonths: number; incomeChange: number; expenseChange: number; instructions: string };
export const defaultPredictionSettings = (): PredictionSettings => ({ lookbackMonths: 24, incomeChange: 0, expenseChange: 0, instructions: "" });
export function parsePredictionSettings(input: unknown): PredictionSettings {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("予測設定を確認してください。");
  const data = input as Record<string, unknown>;
  let { lookbackMonths, incomeChange, expenseChange } = data;
  const instructions = typeof data.instructions === "string" ? data.instructions.trim() : "";
  if (instructions.length > 500) throw new Error("指示文は500文字以内で入力してください。");
  const text = instructions.normalize("NFKC").replace(/[ \t　]+/g, "");
  const seen = new Set<string>();
  for (const sentence of text.split(/[。、,;；\n]+/).filter(Boolean)) {
    const months = sentence.match(/^過去(\d+)(?:か|ヶ|ケ|ヵ|箇)?月(?:分)?(?:を)?(?:使う|考慮する|考慮して|参照する|対象にする)?$/);
    if (months) {
      if (seen.has("months")) throw new Error("対象期間の指示は1つにしてください。");
      seen.add("months"); lookbackMonths = Number(months[1]); continue;
    }
    const adjustment = sentence.match(/^(収入|支出)(?:を|は)?(\d+(?:\.\d+)?)%(増やす|増加|増|多め|減らす|減少|減|少なめ)$/);
    if (!adjustment) throw new Error("未対応の指示です。「過去12か月を考慮して」「支出を10%増やす」の形式で入力してください。");
    const key = adjustment[1] === "収入" ? "income" : "expense";
    if (seen.has(key)) throw new Error("同じ収支への指示は1つにしてください。");
    seen.add(key);
    const value = Number(adjustment[2]) * (/^(減|少)/.test(adjustment[3]) ? -1 : 1);
    if (key === "income") incomeChange = value; else expenseChange = value;
  }
  if (typeof lookbackMonths !== "number" || !Number.isInteger(lookbackMonths) || lookbackMonths < 3 || lookbackMonths > 120) throw new Error("対象期間は3〜120か月で指定してください。");
  if ([incomeChange, expenseChange].some(value => typeof value !== "number" || !Number.isFinite(value) || value < -90 || value > 100)) throw new Error("収入・支出の補正は−90〜100%で指定してください。");
  return { lookbackMonths, incomeChange: incomeChange as number, expenseChange: expenseChange as number, instructions };
}
