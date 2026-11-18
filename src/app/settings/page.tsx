"use client";
import { fetchReference } from "@/lib/reference-fetch";

import { categoryColor, categoryChoiceStyle } from "@/lib/category-colors";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/loading-spinner";
import {
  CategoryKind,
  CategoryOption,
  getCategoriesByKind,
  isIncomeCategory,
} from "@/lib/category-options";
import { SettingsPanel } from "@/components/settings-panel";
import { MonthlyBudgetSettings } from "@/components/monthly-budget-settings";
import dynamic from "next/dynamic";
import type { AccountProfile } from "@/components/account-edit-dialog";
import { ImportExclusionsSettings } from "@/components/import-exclusions-settings";
import { SELECTED_MEMBER_ID_KEY } from "@/lib/member-storage";

const AccountEditDialog = dynamic(() => import("@/components/account-edit-dialog").then(module => module.AccountEditDialog), { ssr: false });

interface MerchantRule {
  id: string;
  merchant: string;
  categoryId: string;
  category: CategoryOption;
}

type Member = AccountProfile;

export default function SettingsPage() {
  const [kind, setKind] = useState<CategoryKind>("expense");
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [rules, setRules] = useState<MerchantRule[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [rulePageByCategory, setRulePageByCategory] = useState<Record<string, number>>({});
  const [closedRuleCategories, setClosedRuleCategories] = useState<Set<string>>(new Set());
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const editTrigger = useRef<HTMLButtonElement | null>(null);
  const [membersLoading, setMembersLoading] = useState(true), [membersError, setMembersError] = useState(""), [memberRetry, setMemberRetry] = useState(0);
  const [mappingLoaded, setMappingLoaded] = useState(false), [mappingError, setMappingError] = useState(""), [mappingRetry, setMappingRetry] = useState(0);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mappingOpen, setMappingOpen] = useState(false);
  const [merchant, setMerchant] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const visibleCategories = useMemo(
    () => getCategoriesByKind(categories, kind),
    [categories, kind]
  );

  const visibleRules = useMemo(
    () =>
      rules.filter((rule) =>
        kind === "income" ? isIncomeCategory(rule.category) : !isIncomeCategory(rule.category)
      ),
    [kind, rules]
  );

  const ruleGroups = useMemo(() => {
    const groups = new Map<string, { category: CategoryOption; rules: MerchantRule[] }>();
    for (const rule of visibleRules) {
      const current = groups.get(rule.category.name) ?? {
        category: rule.category,
        rules: [],
      };
      current.rules.push(rule);
      groups.set(rule.category.name, current);
    }
    const order = new Map(visibleCategories.map((category, index) => [category.name, index]));
    return Array.from(groups.values()).map((group) => ({
      ...group,
      rules: [...group.rules].sort((a, b) => a.merchant.localeCompare(b.merchant, "ja")),
    })).sort((a, b) => {
      const aOrder = order.has(a.category.name) ? order.get(a.category.name)! : 999;
      const bOrder = order.has(b.category.name) ? order.get(b.category.name)! : 999;
      const byOrder = aOrder - bOrder;
      if (byOrder !== 0) return byOrder;
      return a.category.name.localeCompare(b.category.name, "ja");
    });
  }, [visibleCategories, visibleRules]);

  const selectedMember = members.find((member) => member.id === selectedMemberId) ?? null;
  useEffect(() => {
    if (window.location.hash === "#account-settings") {
      // The link fragment is only available after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAccountOpen(true);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setMembersLoading(true); setMembersError("");
      try {
        const response = await fetchReference("/api/members");
        if (!response.ok) throw new Error("アカウントを読み込めませんでした。");
        const data: Member[] = await response.json();
        if (!active) return;
        setMembers(data);
        const selected = data.find(member => member.id === localStorage.getItem(SELECTED_MEMBER_ID_KEY)) ?? data[0];
        setSelectedMemberId(selected?.id ?? "");
      } catch (e) { if (active) setMembersError(e instanceof Error ? e.message : "読み込めませんでした。"); }
      finally { if (active) setMembersLoading(false); }
    };
    void load(); return () => { active = false; };
  }, [memberRetry]);

  useEffect(() => {
    if (!mappingOpen || mappingLoaded) return;
    const controller = new AbortController();
    const load = async () => {
      setLoading(true); setMappingError("");
      try {
        const responses = await Promise.all([fetchReference("/api/categories", { signal: controller.signal }), fetch("/api/merchant-rules", { signal: controller.signal })]);
        if (responses.some(response => !response.ok)) throw new Error("カテゴリマッピングを読み込めませんでした。");
        const [categoryData, ruleData] = await Promise.all(responses.map(response => response.json()));
        if (controller.signal.aborted) return;
        setCategories(categoryData); setRules(ruleData); setMappingLoaded(true);
      } catch (e) { if (!controller.signal.aborted) setMappingError(e instanceof Error ? e.message : "読み込めませんでした。"); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    };
    void load(); return () => controller.abort();
  }, [mappingOpen, mappingLoaded, mappingRetry]);

  const closeEditor = () => { setEditingMember(null); requestAnimationFrame(() => editTrigger.current?.focus()); };

  const handleSelectMember = (member: Member) => {
    setSelectedMemberId(member.id);
  };

  const handleSwitchMember = () => {
    if (!selectedMember) {
      toast.error("アカウントを選択してください");
      return;
    }

    localStorage.setItem(SELECTED_MEMBER_ID_KEY, selectedMember.id);
    window.dispatchEvent(new Event("kakeibo:member-changed"));
    toast.success("アカウントを切り替えました");
  };

  const handleSave = async () => {
    if (!merchant.trim() || !categoryId) {
      toast.error("店舗名とカテゴリを選んでください");
      return;
    }

    setSaving(true);
    const response = await fetch("/api/merchant-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchant: merchant.trim(), categoryId }),
    });
    setSaving(false);

    if (!response.ok) {
      toast.error("ルールを保存できませんでした");
      return;
    }

    const data = (await response.json()) as MerchantRule & { appliedCount?: number };
    toast.success(`ルールを登録しました（${data.appliedCount ?? 0}件に適用）`);
    setMerchant("");
    setCategoryId("");
    setRules(current => [...current.filter(rule => rule.id !== data.id), data]);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このルールを削除しますか？")) return;

    const response = await fetch("/api/merchant-rules", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (!response.ok) {
      toast.error("削除できませんでした");
      return;
    }

    toast.success("ルールを削除しました");
    setRules(current => current.filter(rule => rule.id !== id));
  };

  const toggleRuleCategory = (categoryName: string) => {
    setClosedRuleCategories((current) => {
      const next = new Set(current);
      if (next.has(categoryName)) {
        next.delete(categoryName);
      } else {
        next.add(categoryName);
      }
      return next;
    });
  };

  const setRulePage = (categoryName: string, page: number) => {
    setRulePageByCategory((current) => ({ ...current, [categoryName]: Math.max(page, 0) }));
  };

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-3">
      <div>
        <h1 className="text-xl font-bold text-[#253b4b]">設定</h1>
      </div>

      <SettingsPanel id="account-settings" title="アカウント" open={accountOpen} onToggle={() => setAccountOpen(value => !value)} contentId="settings-account" className="order-1">
          {membersError ? <div role="alert"><p className="text-sm text-destructive">{membersError}</p><button type="button" onClick={() => setMemberRetry(value => value + 1)} className="mt-2 text-sm text-primary underline">再読み込み</button></div> : membersLoading ? (
            <LoadingSpinner className="py-4" />
          ) : members.length === 0 ? (
            <p className="py-4 text-center text-sm text-[#8a97a1]">アカウントがありません</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                {members.map((member) => (
                  <div key={member.id} className={`flex min-w-0 items-center rounded-lg border ${selectedMemberId === member.id ? "border-[#245f8b] bg-[#e9f1f7] text-[#1f4f73]" : "border-[#e2e8ed] bg-white text-[#415665]"}`}>
                    <button type="button" onClick={() => handleSelectMember(member)} aria-pressed={selectedMemberId === member.id} className="flex min-w-0 flex-1 items-center gap-2 px-3 py-3 text-left text-sm font-bold"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: member.color }} /><span className="truncate">{member.name}</span></button>
                    <button type="button" aria-label={`${member.name}のプロフィールを編集`} onClick={event => { editTrigger.current = event.currentTarget; setEditingMember(member); }} className="shrink-0 rounded-lg p-3 text-muted-foreground hover:bg-muted"><Pencil className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
              <Button type="button" className="h-10 w-full" onClick={handleSwitchMember}>
                切り替え
              </Button>
            </>
          )}
      </SettingsPanel>

      <MonthlyBudgetSettings />
      <ImportExclusionsSettings />

      <SettingsPanel title="カテゴリマッピング" open={mappingOpen} onToggle={() => setMappingOpen(value => !value)} contentId="settings-mapping" className="order-2">
      {mappingError && <div role="alert" className="text-sm text-destructive">{mappingError}<button type="button" onClick={() => setMappingRetry(value => value + 1)} className="ml-2 underline">再読み込み</button></div>}
      <div className="space-y-4 pt-3">
        <p className="text-sm font-semibold text-[#253b4b]">ルール追加</p>
          {loading ? (
            <LoadingSpinner className="py-4" />
          ) : (
          <>
          <div className="grid grid-cols-2 gap-2 rounded-[10px] bg-[#e2e8ed] p-1">
            {(["expense", "income"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setKind(value);
                  setCategoryId("");
                }}
                className={`h-10 rounded-lg text-sm font-bold ${
                  kind === value
                    ? value === "expense"
                      ? "bg-[#c1432f] text-white"
                      : "bg-[#3f6f51] text-white"
                    : "text-[#72818b]"
                }`}
              >
                {value === "expense" ? "支出" : "収入"}
              </button>
            ))}
          </div>
          <input
            value={merchant}
            onChange={(event) => setMerchant(event.target.value)}
            placeholder="例: コープ"
            className="h-11 w-full rounded-lg border border-[#e2e8ed] bg-white px-3 text-sm outline-none focus:border-[#8faec5]"
          />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {visibleCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setCategoryId(category.id)}
                className={`flex w-full items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-sm font-semibold ${
                  categoryId === category.id
                      ? "border-[#245f8b] bg-[#e9f1f7] text-[#245f8b]"
                    : "border-[#dce5ed] bg-[#f8fafc] text-[#415665]"
                }`}
                aria-pressed={categoryId === category.id}
                style={categoryChoiceStyle(category.name, categoryId === category.id)}

              >
                <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: categoryColor(category.name) }} />
                {category.name}
              </button>
            ))}
          </div>
          <Button className="h-11 w-full" onClick={handleSave} disabled={saving}>
            {saving ? "保存中..." : "追加"}
          </Button>
          </>
          )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-[#253b4b]">登録済みルール</p>
      </div>

      <div className="space-y-2">
        {loading ? (
          <Card>
            <CardContent className="py-8">
              <LoadingSpinner />
            </CardContent>
          </Card>
        ) : ruleGroups.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-[#8a97a1]">
              ルールがありません
            </CardContent>
          </Card>
        ) : (
          ruleGroups.map((group) => {
            const page = rulePageByCategory[group.category.name] ?? 0;
            const pageCount = Math.max(Math.ceil(group.rules.length / 10), 1);
            const safePage = Math.min(page, pageCount - 1);
            const pageRules = group.rules.slice(safePage * 10, safePage * 10 + 10);
            const closed = !closedRuleCategories.has(group.category.name);

            return (
              <SettingsPanel key={group.category.name} nested open={!closed} onToggle={() => toggleRuleCategory(group.category.name)} contentId={"settings-mapping-category-" + group.category.id} title={<><span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: categoryColor(group.category.name) }} /><span className="min-w-0 flex-1 truncate">{group.category.name}</span><span className="text-xs text-muted-foreground">{group.rules.length}件</span></>}>
                    {pageRules.map((rule) => (
                      <div key={rule.id} className="flex items-center gap-3 rounded-lg bg-[#f4f6f8] p-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#253b4b]">
                            {rule.merchant}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-[#cbd5de] hover:text-[#ad3929]"
                          onClick={() => handleDelete(rule.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">削除</span>
                        </Button>
                      </div>
                    ))}
                    {pageCount > 1 ? (
                      <div className="flex items-center justify-between pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="bg-white"
                          disabled={safePage === 0}
                          onClick={() => setRulePage(group.category.name, safePage - 1)}
                        >
                          前へ
                        </Button>
                        <span className="text-xs font-semibold text-[#72818b]">
                          {safePage + 1} / {pageCount}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="bg-white"
                          disabled={safePage >= pageCount - 1}
                          onClick={() => setRulePage(group.category.name, safePage + 1)}
                        >
                          次へ
                        </Button>
                      </div>
                    ) : null}
              </SettingsPanel>
            );
          })
        )}
      </div>
      </SettingsPanel>
      {editingMember && <AccountEditDialog member={editingMember} onClose={closeEditor} onSaved={member => { setMembers(current => current.map(item => item.id === member.id ? member : item)); closeEditor(); }} />}
    </div>
  );
}
