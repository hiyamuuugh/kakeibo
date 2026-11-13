"use client";

import { categoryColor, categoryChoiceStyle } from "@/lib/category-colors";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/loading-spinner";
import {
  CategoryKind,
  CategoryOption,
  getCategoriesByKind,
  isIncomeCategory,
} from "@/lib/category-options";
import { ImportExclusionsSettings } from "@/components/import-exclusions-settings";
import { SELECTED_MEMBER_ID_KEY } from "@/lib/member-storage";

interface MerchantRule {
  id: string;
  merchant: string;
  categoryId: string;
  category: CategoryOption;
}

interface Member {
  id: string;
  name: string;
  color: string;
}

export default function SettingsPage() {
  const [kind, setKind] = useState<CategoryKind>("expense");
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [rules, setRules] = useState<MerchantRule[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [rulePageByCategory, setRulePageByCategory] = useState<Record<string, number>>({});
  const [closedRuleCategories, setClosedRuleCategories] = useState<Set<string>>(new Set());
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
  const loadData = async () => {
    const [categoryResponse, ruleResponse, memberResponse] = await Promise.all([
      fetch("/api/categories"),
      fetch("/api/merchant-rules"),
      fetch("/api/members"),
    ]);
    setCategories((await categoryResponse.json()) as CategoryOption[]);
    setRules((await ruleResponse.json()) as MerchantRule[]);
    const memberData = (await memberResponse.json()) as Member[];
    setMembers(memberData);
    const savedMemberId = localStorage.getItem(SELECTED_MEMBER_ID_KEY);
    const nextMember =
      memberData.find((member) => member.id === selectedMemberId) ??
      memberData.find((member) => member.id === savedMemberId) ??
      memberData[0] ??
      null;
    if (nextMember) {
      setSelectedMemberId(nextMember.id);
      localStorage.setItem(SELECTED_MEMBER_ID_KEY, nextMember.id);
    }
    setLoading(false);
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/categories"),
      fetch("/api/merchant-rules"),
      fetch("/api/members"),
    ])
      .then(async ([categoryResponse, ruleResponse, memberResponse]) => {
        setCategories((await categoryResponse.json()) as CategoryOption[]);
        setRules((await ruleResponse.json()) as MerchantRule[]);
        const memberData = (await memberResponse.json()) as Member[];
        setMembers(memberData);
        const savedMemberId = localStorage.getItem(SELECTED_MEMBER_ID_KEY);
        const nextMember =
          memberData.find((member) => member.id === savedMemberId) ?? memberData[0] ?? null;
        if (nextMember) {
          setSelectedMemberId(nextMember.id);
          localStorage.setItem(SELECTED_MEMBER_ID_KEY, nextMember.id);
        }
      })
      .catch(() => toast.error("設定を読み込めませんでした"))
      .finally(() => setLoading(false));
  }, []);

  const handleSelectMember = (member: Member) => {
    setSelectedMemberId(member.id);
  };

  const handleSwitchMember = () => {
    if (!selectedMember) {
      toast.error("アカウントを選択してください");
      return;
    }

    localStorage.setItem(SELECTED_MEMBER_ID_KEY, selectedMember.id);
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
    await loadData();
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
    await loadData();
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

      <Card className="order-1">
        <button
          type="button"
          onClick={() => setAccountOpen((value) => !value)}
          className="flex w-full items-center justify-between p-4 text-left"
        >
          <CardTitle className="text-sm font-semibold">アカウント</CardTitle>
          {accountOpen ? (
            <ChevronDown className="h-4 w-4 text-[#8a97a1]" />
          ) : (
            <ChevronRight className="h-4 w-4 text-[#8a97a1]" />
          )}
        </button>
        {accountOpen ? (
        <CardContent className="space-y-4 border-t border-[#edf2f6] pt-2">
          {loading ? (
            <LoadingSpinner className="py-4" />
          ) : members.length === 0 ? (
            <p className="py-4 text-center text-sm text-[#8a97a1]">アカウントがありません</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                {members.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => handleSelectMember(member)}
                    className={`rounded-lg border px-3 py-2 text-left text-sm font-bold ${
                      selectedMemberId === member.id
                        ? "border-[#245f8b] bg-[#e9f1f7] text-[#1f4f73]"
                        : "border-[#e2e8ed] bg-white text-[#415665]"
                    }`}
                  >
                    <span
                      className="mr-2 inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: member.color }}
                    />
                    {member.name}
                  </button>
                ))}
              </div>
              <Button type="button" className="h-10 w-full" onClick={handleSwitchMember}>
                切り替え
              </Button>
            </>
          )}
        </CardContent>
        ) : null}
      </Card>

      <ImportExclusionsSettings />

      <Card className="order-2">
        <button
          type="button"
          onClick={() => setMappingOpen((value) => !value)}
          className="flex w-full items-center justify-between p-4 text-left"
        >
          <CardTitle className="text-sm font-semibold">カテゴリマッピング</CardTitle>
          {mappingOpen ? (
            <ChevronDown className="h-4 w-4 text-[#8a97a1]" />
          ) : (
            <ChevronRight className="h-4 w-4 text-[#8a97a1]" />
          )}
        </button>
        {mappingOpen ? (
        <CardContent className="space-y-4 border-t border-[#edf2f6]">
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
              <Card key={group.category.name}>
                <button
                  type="button"
                  onClick={() => toggleRuleCategory(group.category.name)}
                  className="flex w-full items-center gap-3 p-3 text-left"
                >
                  {closed ? (
                    <ChevronRight className="h-4 w-4 text-[#8a97a1]" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-[#8a97a1]" />
                  )}
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: categoryColor(group.category.name) }}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-bold text-[#253b4b]">
                    {group.category.name}
                  </span>
                  <span className="text-xs font-semibold text-[#8a97a1]">
                    {group.rules.length}件
                  </span>
                </button>
                {closed ? null : (
                  <CardContent className="space-y-2 border-t border-[#edf2f6] p-3">
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
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>
        </CardContent>
        ) : null}
      </Card>
    </div>
  );
}
