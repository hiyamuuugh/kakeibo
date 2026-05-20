"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Transaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  store: string | null;
  source: string;
  categoryId: string | null;
  category: Category | null;
}

const SOURCE_LABELS: Record<string, string> = {
  paypay: "PayPay",
  manual: "手動",
  credit: "クレカ",
};

function formatYen(n: number) {
  return `¥${n.toLocaleString("ja-JP")}`;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [month, setMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [filterCat, setFilterCat] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const loadTransactions = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ month });
    if (filterCat !== "all") params.set("categoryId", filterCat);
    fetch(`/api/transactions?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setTransactions(data);
        setLoading(false);
      });
  }, [month, filterCat]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories);
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  async function updateCategory(txId: string, categoryId: string) {
    const res = await fetch(`/api/transactions/${txId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId: categoryId === "none" ? null : categoryId,
      }),
    });
    if (res.ok) {
      toast.success("カテゴリを更新しました");
      loadTransactions();
    }
  }

  async function deleteTransaction(txId: string) {
    if (!confirm("この取引を削除しますか？")) return;
    const res = await fetch(`/api/transactions/${txId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("取引を削除しました");
      loadTransactions();
    }
  }

  const total = transactions.reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">取引一覧</h1>
        <div className="flex gap-2 items-center">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border rounded-md px-3 py-1.5 text-sm"
          />
          <Select value={filterCat} onValueChange={(v) => setFilterCat(v ?? "all")}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="カテゴリ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              <SelectItem value="uncategorized">未分類</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="text-sm text-gray-500">
        {transactions.length}件 / 合計 {formatYen(total)}
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>日付</TableHead>
              <TableHead>内容</TableHead>
              <TableHead>ソース</TableHead>
              <TableHead>カテゴリ</TableHead>
              <TableHead className="text-right">金額</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                  読み込み中…
                </TableCell>
              </TableRow>
            ) : transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                  取引データなし
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                    {format(new Date(tx.date), "M/d(E)", { locale: ja })}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{tx.description}</div>
                    {tx.store && (
                      <div className="text-xs text-gray-400">{tx.store}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {SOURCE_LABELS[tx.source] ?? tx.source}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={tx.categoryId ?? "none"}
                      onValueChange={(v) => updateCategory(tx.id, v ?? "none")}
                    >
                      <SelectTrigger className="h-7 w-28 text-xs">
                        <SelectValue>
                          {tx.category ? (
                            <span className="flex items-center gap-1">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ background: tx.category.color }}
                              />
                              {tx.category.name}
                            </span>
                          ) : (
                            <span className="text-gray-400">未分類</span>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">未分類</SelectItem>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatYen(tx.amount)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-600 h-7 px-2"
                      onClick={() => deleteTransaction(tx.id)}
                    >
                      削除
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
