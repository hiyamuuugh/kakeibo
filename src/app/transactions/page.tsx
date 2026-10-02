"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/loading-spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCategoriesByKind } from "@/lib/category-options";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Category {
  id: string;
  name: string;
  type: string;
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
  memberId: string | null;
  member: Member | null;
}

interface Member {
  id: string;
  name: string;
  color: string;
}

const SOURCE_LABELS: Record<string, string> = {
  paypay: "PayPay",
  paypay_card: "PayPayカード",
  rakuten: "楽天カード",
  mufg: "三菱UFJ",
  smbc: "三井住友",
  manual: "手入力",
  credit: "クレカ",
};

const formatYen = (amount: number) => `¥${amount.toLocaleString("ja-JP")}`;

const getFilterLabel = (value: string, categories: Category[]) => {
  if (value === "all") return "すべて";
  if (value === "uncategorized") return "未分類";
  return categories.find((category) => category.id === value)?.name ?? "カテゴリ";
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [month, setMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [filterCat, setFilterCat] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [filterMember, setFilterMember] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);

  const loadTransactions = useCallback(() => {
    const params = new URLSearchParams({ month });

    if (filterCat !== "all") {
      params.set("categoryId", filterCat);
    }
    if (filterMember !== "all") {
      params.set("memberId", filterMember);
    }

    fetch(`/api/transactions?${params}`)
      .then((response) => response.json())
      .then((data: Transaction[]) => {
        setTransactions(data);
        setLoading(false);
      });
  }, [filterCat, filterMember, month]);

  useEffect(() => {
    fetch("/api/categories")
      .then((response) => response.json())
      .then(setCategories);
    fetch("/api/members")
      .then((response) => response.json())
      .then(setMembers);
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleMonthChange = (value: string) => {
    setLoading(true);
    setMonth(value);
  };

  const handleFilterChange = (value: string) => {
    setLoading(true);
    setFilterCat(value);
  };

  const handleMemberFilterChange = (value: string) => {
    setLoading(true);
    setFilterMember(value);
  };

  const updateCategory = async (transactionId: string, categoryId: string) => {
    const response = await fetch(`/api/transactions/${transactionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId: categoryId === "none" ? null : categoryId,
      }),
    });

    if (response.ok) {
      setLoading(true);
      toast.success("カテゴリを更新しました");
      loadTransactions();
    }
  };

  const deleteTransaction = async (transactionId: string) => {
    if (!confirm("この取引を削除しますか？")) {
      return;
    }

    const response = await fetch(`/api/transactions/${transactionId}`, {
      method: "DELETE",
    });

    if (response.ok) {
      setLoading(true);
      toast.success("削除しました");
      loadTransactions();
    }
  };

  const displayedTransactions = transactions.filter((transaction) => {
    const searchText = keyword.trim().toLowerCase();

    if (filterType === "expense" && transaction.amount < 0) return false;
    if (filterType === "income" && transaction.amount >= 0) return false;
    if (filterSource !== "all" && transaction.source !== filterSource) return false;
    if (
      searchText &&
      ![
        transaction.description,
        transaction.store,
        transaction.member?.name,
        transaction.category?.name,
        SOURCE_LABELS[transaction.source] ?? transaction.source,
      ]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(searchText))
    ) {
      return false;
    }
    return true;
  });
  const total = displayedTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const expenseCategories = getCategoriesByKind(categories, "expense");
  const incomeCategories = getCategoriesByKind(categories, "income");
  const sourceOptions = Array.from(new Set(transactions.map((transaction) => transaction.source))).sort();

  const categoryPicker = (
    <Select value={filterCat} onValueChange={(value) => handleFilterChange(value ?? "all")}>
      <SelectTrigger className="h-10 w-full bg-white sm:w-44">
        <span data-slot="select-value" className="flex flex-1 text-left">
          {getFilterLabel(filterCat, categories)}
        </span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">すべて</SelectItem>
        <SelectItem value="uncategorized">未分類</SelectItem>
        {expenseCategories.map((category) => (
          <SelectItem key={category.id} value={category.id}>
            支出: {category.name}
          </SelectItem>
        ))}
        {incomeCategories.map((category) => (
          <SelectItem key={category.id} value={category.id}>
            収入: {category.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 rounded-xl border-b border-[#e5e7eb] bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold text-[#6b7280]">月ごとの明細</p>
          <h1 className="text-xl font-bold text-[#1f2937]">取引一覧</h1>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(10rem,1fr),auto,9rem,9rem,9rem,12rem]">
          <input
            type="search"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="キーワード検索"
            className="h-10 rounded-lg border border-[#e5e7eb] bg-white px-3 text-sm outline-none"
          />
          <input
            type="month"
            value={month}
            onChange={(event) => handleMonthChange(event.target.value)}
            className="h-10 rounded-lg border border-[#e5e7eb] bg-white px-3 text-sm"
          />
          <Select value={filterType} onValueChange={(value) => setFilterType(value ?? "all")}>
            <SelectTrigger className="h-10 w-full bg-white">
              <SelectValue>
                {filterType === "all" ? "収支すべて" : filterType === "expense" ? "支出" : "収入"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">収支すべて</SelectItem>
              <SelectItem value="expense">支出</SelectItem>
              <SelectItem value="income">収入</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterSource} onValueChange={(value) => setFilterSource(value ?? "all")}>
            <SelectTrigger className="h-10 w-full bg-white">
              <SelectValue>
                {filterSource === "all"
                  ? "取込元すべて"
                  : SOURCE_LABELS[filterSource] ?? filterSource}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">取込元すべて</SelectItem>
              {sourceOptions.map((source) => (
                <SelectItem key={source} value={source}>
                  {SOURCE_LABELS[source] ?? source}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterMember} onValueChange={(value) => handleMemberFilterChange(value ?? "all")}>
            <SelectTrigger className="h-10 w-full bg-white">
              <SelectValue>
                {filterMember === "all"
                  ? "アカウントすべて"
                  : members.find((member) => member.id === filterMember)?.name ?? "アカウント"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">アカウントすべて</SelectItem>
              {members.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {categoryPicker}
        </div>
      </div>

      <div className="flex flex-col gap-1 rounded-[10px] bg-[#f9fafb] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-[#6b7280]">{displayedTransactions.length}件</p>
        <p className="text-base font-bold text-[#1f2937]">{formatYen(total)}</p>
      </div>

      <div className="hidden overflow-hidden rounded-xl bg-white shadow-[0_2px_10px_rgba(0,0,0,0.05)] md:block">
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
                <TableCell colSpan={6} className="py-8 text-center text-slate-400">
                  <LoadingSpinner />
                </TableCell>
              </TableRow>
            ) : displayedTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-slate-400">
                  取引データがありません
                </TableCell>
              </TableRow>
            ) : (
              displayedTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="whitespace-nowrap text-sm text-[#6b7280]">
                    {format(new Date(transaction.date), "M/d(E)", { locale: ja })}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{transaction.description}</div>
                    <div className="text-xs text-[#9ca3af]">
                      {[transaction.store, transaction.member?.name].filter(Boolean).join(" / ")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {SOURCE_LABELS[transaction.source] ?? transaction.source}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <CategorySelect
                      categories={categories}
                      transaction={transaction}
                      onChange={updateCategory}
                    />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatYen(transaction.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-[#d1d5db] hover:text-red-600"
                      onClick={() => deleteTransaction(transaction.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">削除</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 md:hidden">
        {loading ? (
          <div className="rounded-[10px] bg-white px-4 py-8 text-center text-sm text-[#9ca3af] shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
            <LoadingSpinner />
          </div>
        ) : displayedTransactions.length === 0 ? (
          <div className="rounded-[10px] bg-white px-4 py-8 text-center text-sm text-[#9ca3af] shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
            取引データがありません
          </div>
        ) : (
          displayedTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className="space-y-3 rounded-[10px] bg-white p-3 shadow-[0_2px_10px_rgba(0,0,0,0.04)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">
                    {transaction.description}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {format(new Date(transaction.date), "M/d(E)", { locale: ja })}
                    {[transaction.store, transaction.member?.name].filter(Boolean).length > 0
                      ? ` / ${[transaction.store, transaction.member?.name].filter(Boolean).join(" / ")}`
                      : ""}
                  </p>
                </div>
                <p className="shrink-0 text-base font-semibold text-slate-900">
                    {formatYen(transaction.amount)}
                </p>
              </div>

              <div className="flex items-center justify-between gap-3">
                <Badge variant="secondary">
                  {SOURCE_LABELS[transaction.source] ?? transaction.source}
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-[#d1d5db] hover:text-red-600"
                  onClick={() => deleteTransaction(transaction.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">削除</span>
                </Button>
              </div>

              <CategorySelect
                categories={categories}
                transaction={transaction}
                onChange={updateCategory}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CategorySelect({
  categories,
  transaction,
  onChange,
}: {
  categories: Category[];
  transaction: Transaction;
  onChange: (transactionId: string, categoryId: string) => Promise<void>;
}) {
  const selectableCategories = getCategoriesByKind(
    categories,
    transaction.amount < 0 ? "income" : "expense"
  );

  return (
    <Select
      value={transaction.categoryId ?? "none"}
      onValueChange={(value) => onChange(transaction.id, value ?? "none")}
    >
      <SelectTrigger className="h-9 w-full rounded-lg border-[#e5e7eb] bg-white text-xs sm:w-36">
        <SelectValue>
          {transaction.category ? (
            <span className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: transaction.category.color }}
              />
              <span>{transaction.category.name}</span>
            </span>
          ) : (
            <span className="text-[#9ca3af]">未分類</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">未分類</SelectItem>
        {selectableCategories.map((category) => (
          <SelectItem key={category.id} value={category.id}>
            {category.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
