"use client";

import { categoryColor, categoryChoiceStyle } from "@/lib/category-colors";

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
import { prepareReceiptImage, ReceiptImageError } from "@/lib/receipt-image";
import { parseReceipt } from "@/lib/receipt-parser";
import { SELECTED_MEMBER_ID_KEY } from "@/lib/member-storage";

const formatInputDate = (date: Date) => format(date, "yyyy-MM-dd");

export default function NewTransactionPage() {
  const [kind, setKind] = useState<CategoryKind>("expense");
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [memo, setMemo] = useState("");
  const [date, setDate] = useState(() => formatInputDate(new Date()));
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/categories")
      .then((response) => response.json())
      .then((data: CategoryOption[]) => {
        setCategories(data);
        setCategoryId(data.find((category) => category.name === "食費" && category.type === "expense")?.id ?? null);
      })
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
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file || scanning) return;
    setScanning(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const image = await prepareReceiptImage(file);
      const formData = new FormData();
      formData.append("file", image);
      const response = await fetch("/api/ocr", { method: "POST", body: formData, signal: controller.signal });
      const data = await response.json().catch(() => null) as { message?: string; lines?: unknown } | null;
      if (!response.ok) {
        const fallback = response.status === 401 ? "ログインし直してから読み取ってください。" : response.status === 413 ? "画像が大きすぎます。レシート部分だけを撮影してください。" : response.status === 429 ? "OCRの利用上限に達しています。" : "レシートを読み取れませんでした。もう一度お試しください。";
        toast.error(typeof data?.message === "string" ? data.message : fallback);
        return;
      }
      if (!Array.isArray(data?.lines) || !data.lines.length || !data.lines.every(line => typeof line === "string")) {
        toast.error("文字を検出できませんでした。レシートを明るい場所で撮影し直してください。");
        return;
      }
      const parsed = parseReceipt(data.lines);
      if (parsed.amount !== null) setAmount(String(parsed.amount));
      if (parsed.date) setDate(formatInputDate(parsed.date));
      if (parsed.store) setDescription(parsed.store);
      toast.success("レシートを読み取りました");
    } catch (error) {
      toast.error(error instanceof ReceiptImageError ? error.message : controller.signal.aborted ? "読み取りがタイムアウトしました。もう一度お試しください。" : "通信に失敗しました。接続を確認してもう一度お試しください。");
    } finally {
      clearTimeout(timer);
      setScanning(false);
      input.value = "";
    }
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
        memo: memo.trim() || null,
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
    setMemo("");
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
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        onChange={handleScan}
      />

      <div className="grid grid-cols-2 gap-1 rounded-[10px] bg-[#e2e8ed] p-1">
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
                  ? "bg-[#c1432f] text-white"
                  : "bg-[#3f6f51] text-white"
                : "text-[#72818b]"
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
              kind === "expense" ? "border-[#efe0dc]" : "border-[#e5eee7]"
            }`}
          >
            <label className="text-[11px] font-semibold text-[#72818b]">金額</label>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xl font-bold text-[#8a97a1]">¥</span>
              <input
                inputMode="numeric"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0"
                className="min-w-0 flex-1 bg-transparent text-2xl font-extrabold text-[#253b4b] outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#72818b]">内容</label>
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="例: セブンイレブン"
              className="h-9 w-full rounded-lg border border-[#e2e8ed] bg-white px-3 text-sm outline-none focus:border-[#8faec5]"
            />
          </div>

          <div className="grid grid-cols-1 gap-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#72818b]">日付</label>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="h-9 w-full rounded-lg border border-[#e2e8ed] bg-white px-3 text-sm outline-none focus:border-[#8faec5]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#72818b]">メモ(任意)</label>
              <input
                value={memo}
                onChange={(event) => setMemo(event.target.value)}
                placeholder="例: プレゼント"
                className="h-9 w-full rounded-lg border border-[#e2e8ed] bg-white px-3 text-sm outline-none focus:border-[#8faec5]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#72818b]">カテゴリ(任意)</label>
            {categoriesLoading ? (
              <LoadingSpinner className="py-3" />
            ) : (
            <div className="flex flex-wrap gap-1.5">
              {inputCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setCategoryId(category.id)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-semibold ${
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
