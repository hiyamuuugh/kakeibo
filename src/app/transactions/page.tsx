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

const formatSignedYen = (amount: number) => {
  if (amount === 0) return "¥0";
  return `${amount > 0 ? "+" : "-"}${formatYen(Math.abs(amount))}`;
};

const getFilterLabel = (value: string, categories: Category[]) => {
  if (value === "all") return "すべて";
  if (value === "uncategorized") return "未分類";
  return categories.find((category) => category.id === value)?.name ?? "カテゴリ";
};

const getTotalColor = (amount: number) => {
  if (amount > 0) return "text-[#16a34a]";
  if (amount < 0) return "text-[#dc2626]";
  return "text-[#1f2937]";
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

  const filterShellClass =
    "flex min-w-0 items-center rounded-lg border border-[#e5e7eb] bg-white";
  const filterLabelClass =
    "shrink-0 border-r border-[#e5e7eb] px-2.5 text-[11px] font-bold text-[#6b7280]";

  const categoryPicker = (
    <div className={filterShellClass}>
      <span className={filterLabelClass}>カテゴリ</span>
      <Select value={filterCat} onValueChange={(value) => handleFilterChange(value ?? "all")}>
        <SelectTrigger className="h-9 min-w-32 border-0 bg-transparent px-2 text-xs shadow-none focus:ring-0">
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
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="space-y-3 rounded-xl border-b border-[#e5e7eb] bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold text-[#1f2937]">取引一覧</h1>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="month"
              value={month}
              onChange={(event) => handleMonthChange(event.target.value)}
              className="h-9 rounded-lg border border-[#e5e7eb] bg-white px-3 text-sm"
            />
            <p className={`text-right text-lg font-extrabold ${getTotalColor(total)}`}>
              {formatSignedYen(total)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="キーワード検索"
            className="h-9 min-w-44 flex-1 rounded-lg border border-[#e5e7eb] bg-white px-3 text-sm outline-none sm:flex-none"
          />
          <div className={filterShellClass}>
            <span className={filterLabelClass}>収支</span>
            <Select value={filterType} onValueChange={(value) => setFilterType(value ?? "all")}>
              <SelectTrigger className="h-9 min-w-24 border-0 bg-transparent px-2 text-xs shadow-none focus:ring-0">
                <SelectValue>
                  {filterType === "all" ? "すべて" : filterType === "expense" ? "支出" : "収入"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="expense">支出</SelectItem>
                <SelectItem value="income">収入</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className={filterShellClass}>
            <span className={filterLabelClass}>取込元</span>
            <Select value={filterSource} onValueChange={(value) => setFilterSource(value ?? "all")}>
              <SelectTrigger className="h-9 min-w-28 border-0 bg-transparent px-2 text-xs shadow-none focus:ring-0">
                <SelectValue>
                  {filterSource === "all" ? "すべて" : SOURCE_LABELS[filterSource] ?? filterSource}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                {sourceOptions.map((source) => (
                  <SelectItem key={source} value={source}>
                    {SOURCE_LABELS[source] ?? source}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className={filterShellClass}>
            <span className={filterLabelClass}>アカウント</span>
            <Select value={filterMember} onValueChange={(value) => handleMemberFilterChange(value ?? "all")}>
              <SelectTrigger className="h-9 min-w-28 border-0 bg-transparent px-2 text-xs shadow-none focus:ring-0">
                <SelectValue>
                  {filterMember === "all"
                    ? "すべて"
                    : members.find((member) => member.id === filterMember)?.name ?? "アカウント"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {categoryPicker}
        </div>
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
