"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/loading-spinner";
import {
  CategoryKind,
  CategoryOption,
  getCategoriesByKind,
} from "@/lib/category-options";
import { parseReceipt } from "@/lib/receipt-parser";
import { SELECTED_MEMBER_ID_KEY } from "@/lib/member-storage";

const formatInputDate = (date: Date) => format(date, "yyyy-MM-dd");

export default function NewTransactionPage() {
  const [kind, setKind] = useState<CategoryKind>("expense");
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [store, setStore] = useState("");
  const [date, setDate] = useState(() => formatInputDate(new Date()));
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/categories")
      .then((response) => response.json())
      .then((data: CategoryOption[]) => setCategories(data))
      .finally(() => setCategoriesLoading(false));
  }, []);

  const visibleCategories = useMemo(
    () => getCategoriesByKind(categories, kind),
    [categories, kind]
  );
  const inputCategories = useMemo(
    () => visibleCategories.filter((category) => category.name !== "未分類"),
    [visibleCategories]
  );

  const handleScan = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setScanning(true);
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/ocr", {
      method: "POST",
      body: formData,
    });

    setScanning(false);
    event.target.value = "";

    if (response.status === 503) {
      toast.error("OCR設定が未完了です");
      return;
    }
    if (response.status === 429) {
      toast.error("OCRの利用上限に達しています");
      return;
    }
    if (!response.ok) {
      toast.error("レシートを読み取れませんでした");
      return;
    }

    const data = (await response.json()) as { lines?: string[] };
    const parsed = parseReceipt(data.lines ?? []);
    if (parsed.amount !== null) setAmount(String(parsed.amount));
    if (parsed.date) setDate(formatInputDate(parsed.date));
    if (parsed.store) {
      setStore(parsed.store);
      setDescription(parsed.store);
    }
    toast.success("レシートを読み取りました");
  };

  const handleSave = async () => {
    const parsedAmount = Number.parseInt(amount.replace(/[^0-9]/g, ""), 10);
    if (!date || Number.isNaN(parsedAmount) || parsedAmount <= 0 || !description.trim()) {
      toast.error("日付、金額、内容を入力してください");
      return;
    }

    setSaving(true);
    const response = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        amount: kind === "income" ? -parsedAmount : parsedAmount,
        description: description.trim(),
        store: store.trim() || null,
        source: "manual",
        categoryId,
        memberId: localStorage.getItem(SELECTED_MEMBER_ID_KEY),
      }),
    });

    setSaving(false);

    if (!response.ok) {
      toast.error("保存できませんでした");
      return;
    }

    toast.success("取引を保存しました");
    setAmount("");
    setDescription("");
    setStore("");
    setCategoryId(null);
    setDate(formatInputDate(new Date()));
  };

  return (
    <div className="mx-auto max-w-xl space-y-2">
      <Button
        type="button"
        variant="outline"
        className="h-10 w-full gap-2 rounded-[10px] bg-white"
        onClick={() => fileInputRef.current?.click()}
        disabled={scanning}
      >
        <Camera className="h-5 w-5" />
        {scanning ? "読み取り中..." : "レシートを読み取る"}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleScan}
      />

      <div className="grid grid-cols-2 gap-1 rounded-[10px] bg-[#e5e7eb] p-1">
        {(["expense", "income"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setKind(value);
              setCategoryId(null);
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
        <CardContent className="space-y-2.5 pt-3">
          <div
            className={`rounded-[12px] border-2 bg-white p-2 ${
              kind === "expense" ? "border-[#fee2e2]" : "border-[#dcfce7]"
            }`}
          >
            <label className="text-[11px] font-semibold text-[#6b7280]">金額</label>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xl font-bold text-[#9ca3af]">¥</span>
              <input
                inputMode="numeric"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0"
                className="min-w-0 flex-1 bg-transparent text-2xl font-extrabold text-[#1f2937] outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#6b7280]">内容</label>
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="例: スーパー、給料"
              className="h-9 w-full rounded-lg border border-[#e5e7eb] bg-white px-3 text-sm outline-none focus:border-[#93c5fd]"
            />
          </div>

          <div className="grid grid-cols-1 gap-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#6b7280]">日付</label>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="h-9 w-full rounded-lg border border-[#e5e7eb] bg-white px-3 text-sm outline-none focus:border-[#93c5fd]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#6b7280]">店名</label>
              <input
                value={store}
                onChange={(event) => setStore(event.target.value)}
                placeholder="任意"
                className="h-9 w-full rounded-lg border border-[#e5e7eb] bg-white px-3 text-sm outline-none focus:border-[#93c5fd]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#6b7280]">カテゴリ</label>
            {categoriesLoading ? (
              <LoadingSpinner className="py-3" />
            ) : (
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setCategoryId(null)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-semibold ${
                  categoryId === null
                    ? "border-[#3b82f6] bg-[#eff6ff] text-[#2563eb]"
                    : "border-[#e5e7eb] bg-white text-[#6b7280]"
                }`}
              >
                未分類
              </button>
              {inputCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setCategoryId(category.id)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-semibold ${
                    categoryId === category.id
                      ? "border-[#3b82f6] bg-[#eff6ff] text-[#2563eb]"
                      : "border-[#e5e7eb] bg-white text-[#6b7280]"
                  }`}
                  style={
                    categoryId === category.id
                      ? { borderColor: category.color, backgroundColor: `${category.color ?? "#9ca3af"}20` }
                      : { borderColor: `${category.color ?? "#9ca3af"}66` }
                  }
                >
                  {category.name}
                </button>
              ))}
            </div>
            )}
          </div>

          <Button className="h-10 w-full" onClick={handleSave} disabled={saving}>
            {saving ? "保存中..." : "保存"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
