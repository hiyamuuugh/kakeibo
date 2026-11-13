export type AgeRange = { from: number; to: number | null; amount: number };
type RuleBase = { id: string; name: string };
export type AnnualRule = RuleBase & { kind: "annual"; ageAtStart: number | null; flow: "expense" | "income"; ranges: AgeRange[] };
export type InvestmentRule = RuleBase & { kind: "investment"; from: number; to: number | null; monthly: number; rate: number; initial: number };
export type EventRule = RuleBase & { kind: "event"; ageAtStart: number | null; age: number; amount: number };
export type PlanRule = AnnualRule | InvestmentRule | EventRule;
export type CashPlan = { version: 1; startAge: number | null; endAge: number; initialCash: number; monthlyNet: number | null; rules: PlanRule[] };
export const defaultCashPlan = (): CashPlan => ({ version: 1, startAge: null, endAge: 90, initialCash: 0, monthlyNet: null, rules: [] });
const record = (value: unknown): Record<string, unknown> => { if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("入力内容を確認してください。"); return value as Record<string, unknown>; };
function number(value: unknown, label: string, min: number, max: number, integer = true) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) throw new Error(`${label}を確認してください。`);
  return value;
}
const age = (value: unknown) => number(value, "年齢", 0, 120);
const optionalAge = (value: unknown) => value === null ? null : age(value);
const money = (value: unknown) => number(value, "金額", 0, 1000000000000);
export function parseCashPlan(input: unknown): CashPlan {
  const data = record(input);
  if (data.version !== 1 || !Array.isArray(data.rules) || data.rules.length > 100) throw new Error("ルールは100件以内で設定してください。");
  const startAge = optionalAge(data.startAge), endAge = age(data.endAge);
  if (startAge !== null && endAge < startAge) throw new Error("終了年齢は開始年齢以降にしてください。");
  const seen = new Set<string>();
  const rules: PlanRule[] = data.rules.map(item => {
    const rule = record(item);
    if (typeof rule.id !== "string" || !/^[a-zA-Z0-9-]{1,80}$/.test(rule.id) || seen.has(rule.id)) throw new Error("ルールの識別情報を確認してください。");
    seen.add(rule.id);
    if (typeof rule.name !== "string" || !rule.name.trim() || rule.name.trim().length > 80) throw new Error("ルール名は80文字以内で入力してください。");
    const base = { id: rule.id, name: rule.name.trim() };
    if (rule.kind === "annual") {
      if (rule.flow !== "income" && rule.flow !== "expense") throw new Error("収入・支出を選択してください。");
      if (!Array.isArray(rule.ranges) || !rule.ranges.length || rule.ranges.length > 20) throw new Error("年齢区分は1〜20件で設定してください。");
      const ranges = rule.ranges.map(item => { const range = record(item); const from = age(range.from), to = optionalAge(range.to); if (to !== null && to < from) throw new Error("年齢区分の終了を確認してください。"); return { from, to, amount: money(range.amount) }; }).sort((a, b) => a.from - b.from);
      if (ranges.some((range, i) => i > 0 && range.from <= (ranges[i - 1].to ?? 120))) throw new Error("同じルールの年齢区分を重複させないでください。");
      return { ...base, kind: "annual", ageAtStart: optionalAge(rule.ageAtStart), flow: rule.flow, ranges };
    }
    if (rule.kind === "investment") {
      const from = age(rule.from), to = optionalAge(rule.to);
      if (to !== null && to < from) throw new Error("積立の終了年齢を確認してください。");
      return { ...base, kind: "investment", from, to, monthly: number(rule.monthly, "毎月の積立額", 0, 100000000), rate: number(rule.rate, "想定年率", -99, 100, false), initial: money(rule.initial) };
    }
    if (rule.kind === "event") return { ...base, kind: "event", ageAtStart: optionalAge(rule.ageAtStart), age: age(rule.age), amount: money(rule.amount) };
    throw new Error("ルールの種類を選択してください。");
  });
  return { version: 1, startAge, endAge, initialCash: money(data.initialCash), monthlyNet: data.monthlyNet === null ? null : number(data.monthlyNet, "毎月の基本収支", -100000000, 100000000), rules };
}
export function simulateCashPlan(plan: CashPlan, ledgerMonthlyNet: number) {
  if (plan.startAge === null) return [];
  const monthlyNet = plan.monthlyNet ?? ledgerMonthlyNet;
  let cash = plan.initialCash;
  const investmentRules = plan.rules.filter((r): r is InvestmentRule => r.kind === "investment");
  const investments = new Map(investmentRules.map(rule => [rule.id, rule.initial]));
  const points: { label: string; age: number; cash: number; investment: number; total: number; expenses: number; contributions: number; gain: number }[] = [];
  function point(label: string, currentAge: number, expenses: number, contributions: number, gain: number) {
    const invested = [...investments.values()].reduce((sum, value) => sum + value, 0);
    if (![cash, invested].every(value => Number.isFinite(value) && Math.abs(value) < 1000000000000000)) throw new Error("計算額が大きすぎます。期間・利回り・金額を調整してください。");
    points.push({ label, age: currentAge, cash: Math.round(cash), investment: Math.round(invested), total: Math.round(cash) + Math.round(invested), expenses: Math.round(expenses), contributions: Math.round(contributions), gain: Math.round(gain) });
  }
  point("開始時", plan.startAge, 0, 0, 0);
  for (let currentAge = plan.startAge; currentAge <= plan.endAge; currentAge++) {
    const offset = currentAge - plan.startAge;
    let annualNet = 0, expenses = 0, contributions = 0, gain = 0;
    for (const rule of plan.rules) {
      if (rule.kind === "investment") continue;
      const targetAge = (rule.ageAtStart ?? plan.startAge) + offset;
      if (rule.kind === "event" && targetAge === rule.age) { annualNet -= rule.amount; expenses += rule.amount; }
      if (rule.kind === "annual") {
        const range = rule.ranges.find(range => targetAge >= range.from && targetAge <= (range.to ?? 120));
        if (range) { annualNet += rule.flow === "income" ? range.amount : -range.amount; if (rule.flow === "expense") expenses += range.amount; }
      }
    }
    cash += annualNet;
    for (let month = 0; month < 12; month++) {
      cash += monthlyNet;
      for (const rule of investmentRules) {
        const balance = investments.get(rule.id)!;
        const profit = balance * ((1 + rule.rate / 100) ** (1 / 12) - 1);
        const contribution = currentAge >= rule.from && currentAge <= (rule.to ?? 120) ? rule.monthly : 0;
        investments.set(rule.id, balance + profit + contribution);
        cash -= contribution; contributions += contribution; gain += profit;
      }
    }
    point(`${currentAge}歳`, currentAge, expenses, contributions, gain);
  }
  return points;
}
