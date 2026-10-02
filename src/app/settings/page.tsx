"use client";

import { useEffect, useMemo, useState } from "react";
import { RotateCw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CategoryKind,
  CategoryOption,
  getCategoriesByKind,
  isIncomeCategory,
} from "@/lib/category-options";

interface MerchantRule {
  id: string;
  merchant: string;
  categoryId: string;
  category: CategoryOption;
}

export default function SettingsPage() {
  const [kind, setKind] = useState<CategoryKind>("expense");
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [rules, setRules] = useState<MerchantRule[]>([]);
  const [merchant, setMerchant] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [saving, setSaving] = useState(false);
  const [reapplying, setReapplying] = useState(false);

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

  const loadData = async () => {
    const [categoryResponse, ruleResponse] = await Promise.all([
      fetch("/api/categories"),
      fetch("/api/merchant-rules"),
    ]);
    setCategories((await categoryResponse.json()) as CategoryOption[]);
    setRules((await ruleResponse.json()) as MerchantRule[]);
  };

  useEffect(() => {
    Promise.all([fetch("/api/categories"), fetch("/api/merchant-rules")])
      .then(async ([categoryResponse, ruleResponse]) => {
        setCategories((await categoryResponse.json()) as CategoryOption[]);
        setRules((await ruleResponse.json()) as MerchantRule[]);
      })
      .catch(() => toast.error("設定を読み込めませんでした"));
  }, []);

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
    toast.success(`${data.appliedCount ?? 0}件に適用しました`);
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

  const handleReapply = async () => {
    setReapplying(true);
    const response = await fetch("/api/merchant-rules/reapply", { method: "POST" });
    setReapplying(false);

    if (!response.ok) {
      toast.error("再適用できませんでした");
      return;
    }

    const data = (await response.json()) as { appliedCount: number };
    toast.success(`${data.appliedCount}件に再適用しました`);
  };

  return (
    <div className="mx-auto max-w-xl space-y-3">
      <div>
        <p className="text-xs font-semibold text-[#6b7280]">設定</p>
        <h1 className="text-xl font-bold text-[#1f2937]">カテゴリマッピング</h1>
      </div>

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

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">ルール追加</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            value={merchant}
            onChange={(event) => setMerchant(event.target.value)}
            placeholder="例: リライアブルパートナーズ"
            className="h-11 w-full rounded-lg border border-[#e5e7eb] bg-white px-3 text-sm outline-none focus:border-[#93c5fd]"
          />
          <div className="flex flex-wrap gap-2">
            {visibleCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setCategoryId(category.id)}
                className={`rounded-full border px-3 py-2 text-sm font-semibold ${
                  categoryId === category.id
                    ? "border-[#3b82f6] bg-[#eff6ff] text-[#2563eb]"
                    : "border-[#e5e7eb] bg-white text-[#6b7280]"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
          <Button className="h-11 w-full gap-2" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "保存中..." : "ルールを保存"}
          </Button>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-[#1f2937]">登録済みルール</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 bg-white"
          onClick={handleReapply}
          disabled={reapplying}
        >
          <RotateCw className="h-4 w-4" />
          {reapplying ? "再適用中..." : "再適用"}
        </Button>
      </div>

      <div className="space-y-2">
        {visibleRules.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-[#9ca3af]">
              ルールがありません
            </CardContent>
          </Card>
        ) : (
          visibleRules.map((rule) => (
            <Card key={rule.id}>
              <CardContent className="flex items-center gap-3 p-3">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: rule.category.color ?? "#9ca3af" }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#1f2937]">
                    {rule.merchant}
                  </p>
                  <p className="text-xs text-[#6b7280]">{rule.category.name}</p>
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
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
