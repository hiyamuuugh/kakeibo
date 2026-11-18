"use client";
import { useEffect, useState } from "react";
import { SettingsPanel } from "@/components/settings-panel";
import { toast } from "sonner";
import { categoryColor } from "@/lib/category-colors";
import { getCategoriesByKind, type CategoryOption } from "@/lib/category-options";
import { budgetManInputToYen, budgetYenToManInput, parseMonthlyBudget, type MonthlyBudgetPlan } from "@/lib/monthly-budget";

export function MonthlyBudgetSettings() {
  const [open, setOpen] = useState(false), [members, setMembers] = useState<{ id: string; name: string }[]>([]), [categories, setCategories] = useState<CategoryOption[]>([]);
  const [scope, setScope] = useState("family"), [total, setTotal] = useState(""), [amounts, setAmounts] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [error, setError] = useState(""), [retry, setRetry] = useState(0), [dirty, setDirty] = useState(false);
  const endpoint = scope === "family" ? "/api/budget-plan" : `/api/budget-plan?memberId=${encodeURIComponent(scope)}`;
  useEffect(() => {
    if (window.location.hash === "#monthly-budget") {
      // The URL fragment is available only after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(true);
      setScope(new URLSearchParams(window.location.search).get("budgetMemberId") || "family");
    }
  }, []);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    // Hide the previous account draft while its replacement is loading.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true); setReady(false); setError("");
    const read = async (url: string) => { const response = await fetch(url, { signal: controller.signal, cache: "no-store" }); if (!response.ok) throw new Error("毎月の予算を読み込めませんでした。"); return response.json(); };
    Promise.all([read("/api/members"), read("/api/categories"), read(endpoint)]).then(([memberData, categoryData, data]) => {
      if (controller.signal.aborted) return;
      const plan = parseMonthlyBudget(data.plan);
      setMembers(memberData); setCategories(getCategoriesByKind(categoryData, "expense"));
      setTotal(plan.totalAmount === null ? "" : budgetYenToManInput(plan.totalAmount));
      setAmounts(Object.fromEntries(plan.categories.map(row => [row.categoryId, budgetYenToManInput(row.amount)]))); setDirty(false); setReady(true);
    }).catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "読み込めませんでした。"); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [endpoint, open, retry]);
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (saving || loading || !ready) return;
    setError("");
    let plan: MonthlyBudgetPlan;
    try {
      const read = budgetManInputToYen;
      plan = parseMonthlyBudget({ version: 1, totalAmount: total === "" ? null : read(total), categories: Object.entries(amounts).filter(([, value]) => value !== "").map(([categoryId, value]) => ({ categoryId, amount: read(value) })) });
    } catch (e) { setError((e as Error).message); return; }
    setSaving(true);
    try {
      const response = await fetch(endpoint, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(plan) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "保存できませんでした。");
      setDirty(false); toast.success("毎月の予算を保存しました"); window.dispatchEvent(new Event("kakeibo:budget-saved"));
    } catch (e) { setError(e instanceof Error ? e.message : "保存できませんでした。"); }
    finally { setSaving(false); }
  }
  const sumYen = Object.values(amounts).reduce((sum, amount) => {
    try { return sum + budgetManInputToYen(amount); } catch { return sum; }
  }, 0);
  const sum = sumYen / 10000;
  return <SettingsPanel id="monthly-budget" label="毎月の予算設定" title="毎月の予算" open={open} onToggle={() => setOpen(value => !value)} contentId="monthly-budget-form" className="order-1">
      <label className="block text-sm">予算の対象<select aria-label="予算の対象" value={scope} disabled={saving || dirty} onChange={event => setScope(event.target.value)} className="mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-base disabled:opacity-60"><option value="family">家族全員</option>{members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
      {dirty && <p className="text-xs text-muted-foreground">変更を保存するか、<button type="button" disabled={saving} onClick={() => { setDirty(false); setRetry(value => value + 1); }} className="underline">変更を戻す</button>と対象を切り替えられます。</p>}
      {loading ? <p className="text-sm text-muted-foreground">読み込み中…</p> : !ready ? null : <form onSubmit={save}><fieldset disabled={saving || !!error && !categories.length} className="space-y-4">
        <p className="text-xs leading-5 text-muted-foreground">設定した予算を毎月の支出と比較します。「自分」は対象アカウントの予算、「家族全員」は家族共通の予算を使用します。変更は過去の月の表示にも適用されます。</p>
        <label className="block text-sm font-semibold">全体の月予算<div className="mt-1.5 flex items-center gap-2"><input aria-label="全体の月予算" type="number" min="0" max="214748.3647" step="0.0001" inputMode="decimal" placeholder="例：25" value={total} onChange={event => { setTotal(event.target.value); setDirty(true); }} className="min-w-0 flex-1 rounded-lg border border-border px-3 py-2.5 text-base font-normal" /><span className="shrink-0 font-normal">万円</span></div></label>
        <p className="text-xs text-muted-foreground">全体額が空欄ならカテゴリ予算の合計を使用します。空欄は未設定、0は予算0円です。</p>
        <div><h3 className="mb-2 text-sm font-semibold">カテゴリ別の月予算</h3><div className="divide-y divide-border">{categories.map(category => <label key={category.id} className="flex items-center justify-between gap-3 py-2 text-sm"><span className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: categoryColor(category.name) }} /><span>{category.name}</span></span><span className="flex w-36 shrink-0 items-center gap-2 sm:w-44"><input aria-label={`${category.name}の月予算`} type="number" min="0" max="214748.3647" step="0.0001" inputMode="decimal" placeholder="未設定" value={amounts[category.id] ?? ""} onChange={event => { setAmounts(current => ({ ...current, [category.id]: event.target.value })); setDirty(true); }} className="w-full min-w-0 rounded-lg border border-border px-2 py-2 text-base" /><span className="shrink-0">万円</span></span></label>)}</div></div>
        <p className="text-xs text-muted-foreground">カテゴリ予算の合計：{sum.toLocaleString("ja-JP", { maximumFractionDigits: 4 })}万円</p>
        {total !== "" && Number(total) < sum && <p className="text-xs text-[#ad3929]">カテゴリ予算の合計が全体の月予算を上回っています。全体の判定には入力した全体額を使います。</p>}
        <button className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white">{saving ? "保存中…" : "毎月の予算を保存"}</button>
      </fieldset></form>}
      {error && <div role="alert" className="text-sm text-destructive">{error}<button type="button" disabled={saving} onClick={() => setRetry(value => value + 1)} className="ml-2 underline">再読み込み</button></div>}
  </SettingsPanel>;
}
