"use client";

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

interface ImportExclusion {
  id: string;
  name: string;
}

export default function SettingsPage() {
  const [kind, setKind] = useState<CategoryKind>("expense");
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [rules, setRules] = useState<MerchantRule[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [importExclusions, setImportExclusions] = useState<ImportExclusion[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [rulePageByCategory, setRulePageByCategory] = useState<Record<string, number>>({});
  const [closedRuleCategories, setClosedRuleCategories] = useState<Set<string>>(new Set());
  const [accountOpen, setAccountOpen] = useState(false);
  const [mappingOpen, setMappingOpen] = useState(false);
  const [exclusionOpen, setExclusionOpen] = useState(false);
  const [exclusionPage, setExclusionPage] = useState(0);
  const [merchant, setMerchant] = useState("");
  const [exclusionName, setExclusionName] = useState("");
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
  const exclusionPageCount = Math.max(Math.ceil(importExclusions.length / 10), 1);
  const safeExclusionPage = Math.min(exclusionPage, exclusionPageCount - 1);
  const pageExclusions = importExclusions.slice(safeExclusionPage * 10, safeExclusionPage * 10 + 10);

  const loadData = async () => {
    const [categoryResponse, ruleResponse, memberResponse, exclusionResponse] = await Promise.all([
      fetch("/api/categories"),
      fetch("/api/merchant-rules"),
      fetch("/api/members"),
      fetch("/api/import-exclusions"),
    ]);
    setCategories((await categoryResponse.json()) as CategoryOption[]);
    setRules((await ruleResponse.json()) as MerchantRule[]);
    setImportExclusions(
      exclusionResponse.ok ? ((await exclusionResponse.json()) as ImportExclusion[]) : []
    );
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
      fetch("/api/import-exclusions"),
    ])
      .then(async ([categoryResponse, ruleResponse, memberResponse, exclusionResponse]) => {
        setCategories((await categoryResponse.json()) as CategoryOption[]);
        setRules((await ruleResponse.json()) as MerchantRule[]);
        setImportExclusions(
          exclusionResponse.ok ? ((await exclusionResponse.json()) as ImportExclusion[]) : []
        );
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

  const handleAddExclusion = async () => {
    const name = exclusionName.trim();
    if (!name) {
      toast.error("スキップするワードを入力してください");
      return;
    }

    const response = await fetch("/api/import-exclusions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      toast.error(response.status === 409 ? "同じワードが登録されています" : "ワードを登録できませんでした");
      return;
    }

    setExclusionName("");
    setExclusionPage(0);
    toast.success("CSV取込スキップのワードを登録しました");
    await loadData();
  };

  const handleDeleteExclusion = async (id: string) => {
    if (!confirm("このワードを削除しますか？")) return;
    const response = await fetch("/api/import-exclusions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!response.ok) {
      toast.error("ワードを削除できませんでした");
      return;
    }
    toast.success("CSV取込スキップのワードを削除しました");
    setExclusionPage((current) => Math.min(current, Math.max(Math.ceil((importExclusions.length - 1) / 10) - 1, 0)));
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
        <h1 className="text-xl font-bold text-[#1f2937]">設定</h1>
      </div>

      <Card className="order-1">
        <button
          type="button"
          onClick={() => setAccountOpen((value) => !value)}
          className="flex w-full items-center justify-between p-4 text-left"
        >
          <CardTitle className="text-sm font-semibold">アカウント</CardTitle>
          {accountOpen ? (
            <ChevronDown className="h-4 w-4 text-[#9ca3af]" />
          ) : (
            <ChevronRight className="h-4 w-4 text-[#9ca3af]" />
          )}
        </button>
        {accountOpen ? (
        <CardContent className="space-y-4 border-t border-[#f3f4f6] pt-2">
          {loading ? (
            <LoadingSpinner className="py-4" />
          ) : members.length === 0 ? (
            <p className="py-4 text-center text-sm text-[#9ca3af]">アカウントがありません</p>
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
                        ? "border-[#3b82f6] bg-[#eff6ff] text-[#1d4ed8]"
                        : "border-[#e5e7eb] bg-white text-[#374151]"
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

      <Card className="order-3">
        <button
          type="button"
          onClick={() => setExclusionOpen((value) => !value)}
          className="flex w-full items-center justify-between p-4 text-left"
        >
          <CardTitle className="text-sm font-semibold">CSV取込スキップワード</CardTitle>
          {exclusionOpen ? (
            <ChevronDown className="h-4 w-4 text-[#9ca3af]" />
          ) : (
            <ChevronRight className="h-4 w-4 text-[#9ca3af]" />
          )}
        </button>
        {exclusionOpen ? (
          <CardContent className="space-y-3 border-t border-[#f3f4f6]">
            <div className="flex gap-2">
              <input
                value={exclusionName}
                onChange={(event) => setExclusionName(event.target.value)}
                placeholder="スキップするワード（例: 楽天証券）"
                className="h-10 min-w-0 flex-1 rounded-lg border border-[#e5e7eb] bg-white px-3 text-sm outline-none focus:border-[#93c5fd]"
              />
              <Button type="button" className="h-10 shrink-0" onClick={() => void handleAddExclusion()}>
                追加
              </Button>
            </div>
            {importExclusions.length === 0 ? (
              <p className="py-2 text-center text-sm text-[#9ca3af]">登録ワードがありません</p>
            ) : (
              <div className="space-y-2">
                {pageExclusions.map((exclusion) => (
                  <div key={exclusion.id} className="flex items-center gap-2 rounded-lg bg-[#f9fafb] px-3 py-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#1f2937]">{exclusion.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-[#d1d5db] hover:text-red-600"
                      onClick={() => void handleDeleteExclusion(exclusion.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">削除</span>
                    </Button>
                  </div>
                ))}
                {exclusionPageCount > 1 ? (
                  <div className="flex items-center justify-between pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="bg-white"
                      disabled={safeExclusionPage === 0}
                      onClick={() => setExclusionPage(safeExclusionPage - 1)}
                    >
                      前へ
                    </Button>
                    <span className="text-xs font-semibold text-[#6b7280]">
                      {safeExclusionPage + 1} / {exclusionPageCount}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="bg-white"
                      disabled={safeExclusionPage >= exclusionPageCount - 1}
                      onClick={() => setExclusionPage(safeExclusionPage + 1)}
                    >
                      次へ
                    </Button>
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        ) : null}
      </Card>

      <Card className="order-2">
        <button
          type="button"
          onClick={() => setMappingOpen((value) => !value)}
          className="flex w-full items-center justify-between p-4 text-left"
        >
          <CardTitle className="text-sm font-semibold">カテゴリマッピング</CardTitle>
          {mappingOpen ? (
            <ChevronDown className="h-4 w-4 text-[#9ca3af]" />
          ) : (
            <ChevronRight className="h-4 w-4 text-[#9ca3af]" />
          )}
        </button>
        {mappingOpen ? (
        <CardContent className="space-y-4 border-t border-[#f3f4f6]">
      <div className="space-y-4 pt-3">
        <p className="text-sm font-semibold text-[#1f2937]">ルール追加</p>
          {loading ? (
            <LoadingSpinner className="py-4" />
          ) : (
          <>
          <div className="grid grid-cols-2 gap-2 rounded-[10px] bg-[#e5e7eb] p-1">
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
                      ? "bg-[#ef4444] text-white"
                      : "bg-[#22c55e] text-white"
                    : "text-[#6b7280]"
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
            className="h-11 w-full rounded-lg border border-[#e5e7eb] bg-white px-3 text-sm outline-none focus:border-[#93c5fd]"
          />
          <div className="grid grid-cols-3 gap-2">
            {visibleCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setCategoryId(category.id)}
                className={`flex w-full items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-sm font-semibold ${
                  categoryId === category.id
                      ? "border-[#3b82f6] bg-[#eff6ff]"
                    : "border-[#e5e7eb] bg-white"
                }`}
                style={
                  categoryId === category.id
                    ? { borderColor: category.color ?? "#9ca3af", backgroundColor: `${category.color ?? "#9ca3af"}20`, color: category.color ?? "#9ca3af" }
                    : { borderColor: `${category.color ?? "#9ca3af"}66`, color: category.color ?? "#9ca3af" }
                }
              >
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
        <p className="text-sm font-bold text-[#1f2937]">登録済みルール</p>
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
            <CardContent className="py-8 text-center text-sm text-[#9ca3af]">
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
                    <ChevronRight className="h-4 w-4 text-[#9ca3af]" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-[#9ca3af]" />
                  )}
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: group.category.color ?? "#9ca3af" }}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-bold text-[#1f2937]">
                    {group.category.name}
                  </span>
                  <span className="text-xs font-semibold text-[#9ca3af]">
                    {group.rules.length}件
                  </span>
                </button>
                {closed ? null : (
                  <CardContent className="space-y-2 border-t border-[#f3f4f6] p-3">
                    {pageRules.map((rule) => (
                      <div key={rule.id} className="flex items-center gap-3 rounded-lg bg-[#f9fafb] p-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#1f2937]">
                            {rule.merchant}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-[#d1d5db] hover:text-red-600"
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
                        <span className="text-xs font-semibold text-[#6b7280]">
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
