"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Budget {
  id: string;
  month: string;
  amount: number;
  categoryId: string;
  category: Category;
}

interface CategoryStat {
  id: string;
  name: string;
  color: string;
  total: number;
}

function formatYen(n: number) {
  return `¥${n.toLocaleString("ja-JP")}`;
}

export default function BudgetsPage() {
  const [month, setMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [stats, setStats] = useState<CategoryStat[]>([]);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories);
  }, []);

  const load = useCallback(() => {
    Promise.all([
      fetch(`/api/budgets?month=${month}`).then((r) => r.json()),
      fetch(`/api/stats/monthly?month=${month}`).then((r) => r.json()),
    ]).then(([b, s]) => {
      setBudgets(b);
      setStats(s.categories ?? []);
      const init: Record<string, string> = {};
      (b as Budget[]).forEach((budget) => {
        init[budget.categoryId] = String(budget.amount);
      });
      setInputs(init);
    });
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveBudget(categoryId: string) {
    const amount = parseInt(inputs[categoryId] ?? "0", 10);
    if (isNaN(amount)) return;
    setSaving(categoryId);
    const res = await fetch("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, categoryId, amount }),
    });
    setSaving(null);
    if (res.ok) {
      toast.success("予算を保存しました");
      load();
    }
  }

  const getBudget = (catId: string) =>
    budgets.find((b) => b.categoryId === catId);
  const getSpent = (catId: string) =>
    stats.find((s) => s.id === catId)?.total ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">予算管理</h1>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="border rounded-md px-3 py-1.5 text-sm"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {categories.map((cat) => {
          const budget = getBudget(cat.id);
          const spent = getSpent(cat.id);
          const limit = budget?.amount ?? 0;
          const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
          const over = limit > 0 && spent > limit;

          return (
            <Card key={cat.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ background: cat.color }}
                  />
                  {cat.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="予算額（円）"
                    value={inputs[cat.id] ?? ""}
                    onChange={(e) =>
                      setInputs((prev) => ({ ...prev, [cat.id]: e.target.value }))
                    }
                    className="h-8 text-sm"
                  />
                  <Button
                    size="sm"
                    className="h-8"
                    onClick={() => saveBudget(cat.id)}
                    disabled={saving === cat.id}
                  >
                    保存
                  </Button>
                </div>

                {limit > 0 && (
                  <div className="space-y-1">
                    <div className="relative h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${over ? "bg-red-500" : "bg-blue-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>使用: {formatYen(spent)}</span>
                      <span className={over ? "text-red-500 font-medium" : ""}>
                        {over
                          ? `¥${(spent - limit).toLocaleString("ja-JP")} オーバー`
                          : `残: ${formatYen(limit - spent)}`}
                      </span>
                    </div>
                  </div>
                )}

                {limit === 0 && spent > 0 && (
                  <p className="text-xs text-gray-400">
                    今月の支出: {formatYen(spent)}（予算未設定）
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
