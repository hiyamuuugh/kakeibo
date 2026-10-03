"use client";

import { useCallback, useEffect, useState } from "react";
import { addMonths, format, subMonths } from "date-fns";
import { ja } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Eye, EyeOff, MessageSquare, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { SELECTED_MEMBER_ID_KEY } from "@/lib/member-storage";

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
  memo: string | null;
  isPrivate: boolean;
  memberId: string | null;
  member: Member | null;
}

interface Member {
  id: string;
  name: string;
  color: string;
}

type SortOrder = "newest" | "oldest" | "cheapest" | "expensive";

const SOURCE_LABELS: Record<string, string> = {
  paypay: "PayPay",
  paypay_card: "PayPayカード",
  rakuten: "楽天カード",
  mufg: "三菱UFJ",
  smbc: "三井住友",
  manual: "手入力",
  credit: "クレカ",
  saison: "セゾンカード",
};

const SOURCE_COLORS: Record<string, string> = {
  paypay: "#e11d48",
  paypay_card: "#f59e0b",
  rakuten: "#7c3aed",
  mufg: "#2563eb",
  smbc: "#16a34a",
  manual: "#475569",
  credit: "#0891b2",
  saison: "#0f766e",
};

const getSourceStyle = (source: string) => {
  const color = SOURCE_COLORS[source] ?? "#64748b";
  return {
    color,
    backgroundColor: `${color}18`,
    borderColor: `${color}55`,
  };
};

const getMemberStyle = (member: Member | null) => {
  const color = member?.color ?? "#64748b";
  return {
    color,
    backgroundColor: `${color}18`,
    borderColor: `${color}55`,
  };
};

const SOURCE_SEARCH_ALIASES: Record<string, string[]> = {
  paypay: ["ペイペイ"],
  paypay_card: ["ペイペイカード", "paypaycard"],
  rakuten: ["楽天", "ラクテン"],
  mufg: ["三菱UFJ", "ミツビシユーエフジェイ"],
  smbc: ["三井住友", "ミツイスミトモ"],
  manual: ["手入力", "テニュウリョク"],
  credit: ["クレジットカード"],
};

const SOURCE_ORDER = ["paypay", "rakuten", "paypay_card", "saison", "mufg", "smbc", "manual"];

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

const getTransactionAmountColor = (amount: number) =>
  amount < 0 ? "text-[#16a34a]" : "text-[#dc2626]";

const formatTransactionAmount = (amount: number) =>
  `${amount < 0 ? "+" : "-"}${formatYen(Math.abs(amount))}`;

const toKatakana = (value: string) =>
  value.replace(/[ぁ-ん]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) + 0x60)
  );

const normalizeSearchText = (value: string) =>
  toKatakana(value)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s　・ーｰ\-_/.,()[\]（）]/g, "");

const getSearchValues = (transaction: Transaction) => [
  transaction.description,
  transaction.store,
  transaction.memo,
  transaction.member?.name,
  transaction.category?.name,
  SOURCE_LABELS[transaction.source] ?? transaction.source,
  transaction.source,
  ...(SOURCE_SEARCH_ALIASES[transaction.source] ?? []),
];

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [month, setMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [viewMode, setViewMode] = useState<"personal" | "family">("personal");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [membersReady, setMembersReady] = useState(false);
  const [filterCat, setFilterCat] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [filterMember, setFilterMember] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [selectionMode, setSelectionMode] = useState(false);
  const [memoEditingTransaction, setMemoEditingTransaction] = useState<Transaction | null>(null);
  const [memoDraft, setMemoDraft] = useState("");
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<Set<string>>(new Set());

  const loadTransactions = useCallback(() => {
    if (!membersReady || (viewMode === "personal" && !selectedMemberId)) return;

    const params = new URLSearchParams({ month });

    if (filterCat !== "all") {
      params.set("categoryId", filterCat);
    }
    if (viewMode === "personal" && selectedMemberId) {
      params.set("memberId", selectedMemberId);
    }

    fetch(`/api/transactions?${params}`)
      .then((response) => response.json())
      .then((data: Transaction[]) => {
        setTransactions(data);
        setLoading(false);
      });
  }, [filterCat, membersReady, month, selectedMemberId, viewMode]);

  useEffect(() => {
    fetch("/api/categories")
      .then((response) => response.json())
      .then(setCategories);
    fetch("/api/members")
      .then((response) => response.json())
      .then((data: Member[]) => {
        setMembers(data);
        const savedMemberId = localStorage.getItem(SELECTED_MEMBER_ID_KEY);
        const nextMemberId =
          savedMemberId && data.some((member) => member.id === savedMemberId)
            ? savedMemberId
            : data[0]?.id || "";
        setSelectedMemberId(nextMemberId);
        if (nextMemberId) {
          localStorage.setItem(SELECTED_MEMBER_ID_KEY, nextMemberId);
        }
        setMembersReady(true);
      });
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleMonthChange = (value: string) => {
    setLoading(true);
    setSelectionMode(false);
    setSelectedTransactionIds(new Set());
    setMonth(value);
  };

  const goToPrevMonth = () => handleMonthChange(format(subMonths(new Date(`${month}-01`), 1), "yyyy-MM"));
  const goToNextMonth = () => handleMonthChange(format(addMonths(new Date(`${month}-01`), 1), "yyyy-MM"));

  const handleFilterChange = (value: string) => {
    setLoading(true);
    setSelectionMode(false);
    setSelectedTransactionIds(new Set());
    setFilterCat(value);
  };

  const handleMemberFilterChange = (value: string) => {
    setFilterMember(value);
  };

  const handleViewModeChange = (mode: "personal" | "family") => {
    setViewMode(mode);
    setFilterMember("all");
    setSelectionMode(false);
    setSelectedTransactionIds(new Set());
    setLoading(true);
  };

  const toggleTransactionSelection = (transactionId: string) => {
    setSelectedTransactionIds((current) => {
      const next = new Set(current);
      if (next.has(transactionId)) next.delete(transactionId);
      else next.add(transactionId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedTransactionIds((current) => {
      if (sortedTransactions.length > 0 && sortedTransactions.every((transaction) => current.has(transaction.id))) {
        return new Set();
      }
      return new Set(sortedTransactions.map((transaction) => transaction.id));
    });
  };

  const deleteSelectedTransactions = async () => {
    const ids = [...selectedTransactionIds];
    if (ids.length === 0 || !confirm(`${ids.length}件の取引を削除しますか？`)) return;

    const results = await Promise.all(
      ids.map(async (id) => {
        const response = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
        return { id, ok: response.ok };
      })
    );
    const deletedIds = new Set(results.filter((result) => result.ok).map((result) => result.id));
    setTransactions((current) => current.filter((transaction) => !deletedIds.has(transaction.id)));
    setSelectionMode(false);
    setSelectedTransactionIds(new Set());
    if (deletedIds.size > 0) toast.success(`${deletedIds.size}件削除しました`);
    if (deletedIds.size < ids.length) toast.error("一部の取引を削除できませんでした");
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
      const updated = (await response.json()) as Transaction;
      setTransactions((current) =>
        current.map((transaction) =>
          transaction.id === updated.id
            ? {
                ...transaction,
                categoryId: updated.categoryId,
                category: updated.category,
              }
            : transaction
        )
      );
      toast.success("カテゴリを更新しました");
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
      setTransactions((current) =>
        current.filter((transaction) => transaction.id !== transactionId)
      );
      toast.success("削除しました");
    }
  };

  const togglePrivate = async (transaction: Transaction) => {
    const response = await fetch(`/api/transactions/${transaction.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPrivate: !transaction.isPrivate }),
    });

    if (response.ok) {
      const updated = (await response.json()) as Transaction;
      setTransactions((current) =>
        current.map((item) =>
          item.id === updated.id ? { ...item, isPrivate: updated.isPrivate } : item
        )
      );
      toast.success(transaction.isPrivate ? "表示しました" : "非表示にしました");
    }
  };

  const updateMemo = async (transaction: Transaction) => {
    setMemoEditingTransaction(transaction);
    setMemoDraft(transaction.memo ?? "");
  };

  const saveMemo = async () => {
    if (!memoEditingTransaction) return;
    const nextMemo = memoDraft.trim();

    const response = await fetch(`/api/transactions/${memoEditingTransaction.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memo: nextMemo || null }),
    });

    if (response.ok) {
      setTransactions((current) =>
        current.map((item) =>
          item.id === memoEditingTransaction.id ? { ...item, memo: nextMemo || null } : item
        )
      );
      setMemoEditingTransaction(null);
      toast.success(nextMemo ? "メモを保存しました" : "メモを削除しました");
    }
  };

  const displayedTransactions = transactions.filter((transaction) => {
    const searchText = normalizeSearchText(keyword.trim());

    if (filterType === "expense" && transaction.amount < 0) return false;
    if (filterType === "income" && transaction.amount >= 0) return false;
    if (
      filterSource !== "all" &&
      !(filterSource === "rakuten"
        ? transaction.source === "rakuten" || transaction.source === "credit"
        : transaction.source === filterSource)
    ) {
      return false;
    }
    if (viewMode === "family" && filterMember !== "all" && transaction.memberId !== filterMember) {
      return false;
    }
    if (
      searchText &&
      !getSearchValues(transaction)
        .filter((value): value is string => Boolean(value))
        .some((value) => normalizeSearchText(value).includes(searchText))
    ) {
      return false;
    }
    return true;
  });
  const visibleTransactions =
    viewMode === "family"
      ? displayedTransactions.filter((transaction) => !transaction.isPrivate)
      : displayedTransactions;
  const sortedTransactions = [...visibleTransactions].sort((a, b) => {
    if (sortOrder === "oldest") return new Date(a.date).getTime() - new Date(b.date).getTime();
    if (sortOrder === "cheapest") return Math.abs(a.amount) - Math.abs(b.amount);
    if (sortOrder === "expensive") return Math.abs(b.amount) - Math.abs(a.amount);
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
  const total = displayedTransactions.reduce((sum, transaction) => sum - transaction.amount, 0);
  const expenseCategories = getCategoriesByKind(categories, "expense");
  const incomeCategories = getCategoriesByKind(categories, "income");
  const filterCategories =
    filterType === "expense"
      ? expenseCategories
      : filterType === "income"
        ? incomeCategories
        : [...expenseCategories, ...incomeCategories];
  const handleFilterTypeChange = (value: string) => {
    const nextType = value === "expense" || value === "income" ? value : "all";
    setFilterType(nextType);
    if (
      filterCat !== "all" &&
      filterCat !== "uncategorized" &&
      !filterCategoriesForType(nextType).some((category) => category.id === filterCat)
    ) {
      setFilterCat("all");
    }
  };

  const filterCategoriesForType = (type: string) =>
    type === "expense"
      ? expenseCategories
      : type === "income"
        ? incomeCategories
        : [...expenseCategories, ...incomeCategories];
  const sourceOptions = [
    ...SOURCE_ORDER,
    ...Array.from(new Set(transactions.map((transaction) => transaction.source))).filter(
      (source) => !SOURCE_ORDER.includes(source)
    ),
  ];
  const monthLabel = format(new Date(`${month}-01`), "yyyy年M月", { locale: ja });

  const filterShellClass =
    "flex min-w-0 flex-1 items-center rounded-lg border border-[#e5e7eb] bg-white";
  const filterLabelClass =
    "shrink-0 border-r border-[#e5e7eb] px-2.5 text-[11px] font-bold text-[#6b7280]";
  const filterLabelColors = {
    balance: "text-[#1f2937]",
    source: "text-[#1f2937]",
    category: "text-[#1f2937]",
  };

  const categoryPicker = (
    <div className={filterShellClass}>
      <span className={`${filterLabelClass} ${filterLabelColors.category}`}>カテゴリ</span>
      <Select value={filterCat} onValueChange={(value) => handleFilterChange(value ?? "all")}>
        <SelectTrigger className="h-9 min-w-0 flex-1 border-0 bg-transparent px-2 text-xs shadow-none focus:ring-0">
          <span data-slot="select-value" className="flex flex-1 text-left">
            {getFilterLabel(filterCat, categories)}
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#9ca3af]" />すべて</span>
          </SelectItem>
          <SelectItem value="uncategorized">
            <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#9ca3af]" />未分類</span>
          </SelectItem>
          {filterCategories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: category.color }} />
                {category.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="space-y-3 rounded-xl border-b border-[#e5e7eb] bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="relative">
          <div className="flex h-10 items-center justify-center">
            <label className="relative inline-flex h-10 items-center justify-center cursor-pointer text-xl font-bold text-[#1f2937]">
              <span>{monthLabel}</span>
              <input
                type="month"
                value={month}
                onChange={(event) => handleMonthChange(event.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={goToPrevMonth}
            className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center text-[#3b82f6]"
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={goToNextMonth}
            className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center text-[#3b82f6]"
          >
            <ChevronRight className="h-6 w-6" strokeWidth={1.5} />
          </button>
          <p className={`text-center text-lg font-extrabold leading-tight ${loading ? "text-[#9ca3af]" : getTotalColor(total)}`}>
            {loading ? "読み込み中..." : formatSignedYen(total)}
          </p>
        </div>
        <div className="grid grid-cols-2 rounded-lg bg-[#e5e7eb] p-0.5">
          <button
            type="button"
            onClick={() => handleViewModeChange("personal")}
            className={`rounded-md py-1.5 text-xs font-bold ${
              viewMode === "personal" ? "bg-[#dbeafe] text-[#2563eb] shadow-sm" : "text-[#6b7280]"
            }`}
          >
            自分
          </button>
          <button
            type="button"
            onClick={() => handleViewModeChange("family")}
            className={`rounded-md py-1.5 text-xs font-bold ${
              viewMode === "family" ? "bg-[#fce7f3] text-[#db2777] shadow-sm" : "text-[#6b7280]"
            }`}
          >
            家族全員
          </button>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="search"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="キーワード検索"
            className="h-9 min-w-0 flex-1 rounded-lg border border-[#e5e7eb] bg-white px-3 text-sm outline-none"
          />
          <div className="flex h-9 w-28 shrink-0 items-center rounded-lg border border-[#e5e7eb] bg-white">
            <span className="flex h-5 items-center border-r border-[#d1d5db] px-2 text-sm text-[#6b7280]">⇅</span>
            <Select value={sortOrder} onValueChange={(value) => setSortOrder((value ?? "newest") as SortOrder)}>
              <SelectTrigger className="h-8 min-w-0 flex-1 border-0 bg-transparent px-0 pl-2 text-xs shadow-none focus:ring-0">
                <SelectValue>
                  {sortOrder === "newest"
                    ? "新しい順"
                    : sortOrder === "oldest"
                      ? "古い順"
                      : sortOrder === "cheapest"
                        ? "安い順"
                        : "高い順"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">新しい順</SelectItem>
                <SelectItem value="oldest">古い順</SelectItem>
                <SelectItem value="cheapest">安い順</SelectItem>
                <SelectItem value="expensive">高い順</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className={filterShellClass}>
            <span className={`${filterLabelClass} ${filterLabelColors.balance}`}>収支</span>
            <Select value={filterType} onValueChange={(value) => handleFilterTypeChange(value ?? "all")}>
              <SelectTrigger className="h-9 min-w-0 flex-1 border-0 bg-transparent px-2 text-xs shadow-none focus:ring-0">
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
            <span className={`${filterLabelClass} ${filterLabelColors.source}`}>取込元</span>
            <Select value={filterSource} onValueChange={(value) => setFilterSource(value ?? "all")}>
              <SelectTrigger className="h-9 min-w-0 flex-1 border-0 bg-transparent px-2 text-xs shadow-none focus:ring-0">
                <SelectValue>
                  {filterSource === "all" ? "すべて" : SOURCE_LABELS[filterSource] ?? filterSource}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                {sourceOptions.map((source) => (
                  <SelectItem key={source} value={source}>
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SOURCE_COLORS[source] ?? "#64748b" }} />
                      {SOURCE_LABELS[source] ?? source}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="min-w-0">{categoryPicker}</div>
          {viewMode === "family" ? (
          <div className={filterShellClass}>
            <span className={filterLabelClass}>アカウント</span>
            <Select
              value={filterMember}
              onValueChange={(value) => handleMemberFilterChange(value ?? "all")}
            >
              <SelectTrigger className="h-9 min-w-0 flex-1 border-0 bg-transparent px-2 text-xs shadow-none focus:ring-0">
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
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-fit justify-self-end border-[#2563eb] bg-white px-3 font-normal text-[#2563eb] hover:bg-[#eff6ff]"
              onClick={() => {
                setSelectionMode((current) => !current);
                if (selectionMode) setSelectedTransactionIds(new Set());
              }}
            >
              {selectionMode ? "解除" : "複数選択"}
            </Button>
          )}
        </div>
        {viewMode === "personal" && selectionMode ? (
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" className="h-8 bg-white" onClick={toggleSelectAll}>
              {sortedTransactions.length > 0 && sortedTransactions.every((transaction) => selectedTransactionIds.has(transaction.id))
                ? "一括解除"
                : "一括選択"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="h-8"
              disabled={selectedTransactionIds.size === 0}
              onClick={() => void deleteSelectedTransactions()}
            >
              削除
            </Button>
          </div>
        ) : null}
      </div>

      <div className="hidden overflow-hidden rounded-xl bg-white shadow-[0_2px_10px_rgba(0,0,0,0.05)] md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                {viewMode === "personal" && selectionMode ? (
                  <input
                    type="checkbox"
                    aria-label="すべて選択"
                    checked={sortedTransactions.length > 0 && sortedTransactions.every((transaction) => selectedTransactionIds.has(transaction.id))}
                    onChange={toggleSelectAll}
                  />
                ) : null}
              </TableHead>
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
                <TableCell colSpan={7} className="py-8 text-center text-slate-400">
                  読み込み中...
                </TableCell>
              </TableRow>
            ) : visibleTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-slate-400">
                  取引データがありません
                </TableCell>
              </TableRow>
            ) : (
              sortedTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="w-10 py-2">
                    {viewMode === "personal" && selectionMode ? (
                      <input
                        type="checkbox"
                        aria-label={`${transaction.description}を選択`}
                        checked={selectedTransactionIds.has(transaction.id)}
                        onChange={() => toggleTransactionSelection(transaction.id)}
                      />
                    ) : null}
                  </TableCell>
                  <TableCell className="whitespace-nowrap py-2 text-xs text-[#6b7280]">
                    {format(new Date(transaction.date), "M/d(E)", { locale: ja })}
                  </TableCell>
                  <TableCell className="py-2 pl-3">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium">{transaction.description}</div>
                      {transaction.memo ? (
                        <span className="max-w-40 truncate text-xs text-[#9ca3af]">{transaction.memo}</span>
                      ) : null}
                    </div>
                    {transaction.store ? <div className="text-xs text-[#9ca3af]">{transaction.store}</div> : null}
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="secondary" style={getSourceStyle(transaction.source)}>
                        {SOURCE_LABELS[transaction.source] ?? transaction.source}
                      </Badge>
                      {viewMode === "family" ? (
                        <Badge variant="secondary" style={getMemberStyle(transaction.member)}>
                          {transaction.member?.name ?? "未設定"}
                        </Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                      <CategorySelect
                      categories={categories}
                      transaction={transaction}
                      onChange={updateCategory}
                      />
                  </TableCell>
                  <TableCell className={`py-2 text-right font-bold ${getTransactionAmountColor(transaction.amount)}`}>
                    {formatTransactionAmount(transaction.amount)}
                  </TableCell>
                  <TableCell className="py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-[#d1d5db] hover:text-[#3b82f6]"
                        onClick={() => updateMemo(transaction)}
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span className="sr-only">メモ</span>
                      </Button>
                      {viewMode === "personal" ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-[#d1d5db] hover:text-[#3b82f6]"
                          onClick={() => togglePrivate(transaction)}
                        >
                          {transaction.isPrivate ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          <span className="sr-only">非表示</span>
                        </Button>
                      ) : null}
                      {viewMode === "personal" ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-[#d1d5db] hover:text-red-600"
                          onClick={() => deleteTransaction(transaction.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">削除</span>
                        </Button>
                      ) : null}
                    </div>
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
            読み込み中...
          </div>
        ) : visibleTransactions.length === 0 ? (
          <div className="rounded-[10px] bg-white px-4 py-8 text-center text-sm text-[#9ca3af] shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
            取引データがありません
          </div>
        ) : (
          sortedTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className="space-y-1.5 rounded-[10px] bg-white p-2.5 shadow-[0_2px_10px_rgba(0,0,0,0.04)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  {viewMode === "personal" && selectionMode ? (
                    <input
                      type="checkbox"
                      aria-label={`${transaction.description}を選択`}
                      checked={selectedTransactionIds.has(transaction.id)}
                      onChange={() => toggleTransactionSelection(transaction.id)}
                    />
                  ) : null}
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {transaction.description}
                  </p>
                  {transaction.memo ? (
                    <span className="max-w-32 truncate text-xs text-[#9ca3af]">{transaction.memo}</span>
                  ) : null}
                </div>
                <p className={`shrink-0 text-base font-bold ${getTransactionAmountColor(transaction.amount)}`}>
                  {formatTransactionAmount(transaction.amount)}
                </p>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <div className="flex shrink-0 flex-col items-start leading-tight">
                  <span>{format(new Date(transaction.date), "M/d(E)", { locale: ja })}</span>
                </div>
                <div className="flex min-w-0 flex-1 items-center gap-1">
                  <Badge variant="secondary" style={getSourceStyle(transaction.source)}>{SOURCE_LABELS[transaction.source] ?? transaction.source}</Badge>
                  {viewMode === "family" ? (
                    <Badge variant="secondary" style={getMemberStyle(transaction.member)}>
                      {transaction.member?.name ?? "未設定"}
                    </Badge>
                  ) : null}
                </div>
                <div className="ml-1 w-24 shrink-0">
                  <CategorySelect
                    categories={categories}
                    transaction={transaction}
                    onChange={updateCategory}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-[#d1d5db] hover:text-[#3b82f6]"
                  onClick={() => updateMemo(transaction)}
                >
                  <MessageSquare className="h-4 w-4" />
                  <span className="sr-only">メモ</span>
                </Button>
                {viewMode === "personal" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-[#d1d5db] hover:text-[#3b82f6]"
                    onClick={() => togglePrivate(transaction)}
                  >
                    {transaction.isPrivate ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    <span className="sr-only">非表示</span>
                  </Button>
                ) : null}
                {viewMode === "personal" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-[#d1d5db] hover:text-red-600"
                    onClick={() => deleteTransaction(transaction.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">削除</span>
                  </Button>
                ) : null}
              </div>

              {transaction.store ? (
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <span className="truncate text-xs text-[#9ca3af]">{transaction.store}</span>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
      {memoEditingTransaction ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-4 shadow-xl">
            <div className="mb-3">
              <p className="text-sm font-bold text-[#1f2937]">メモ</p>
            </div>
            <div className="relative">
              <input
                autoFocus
                value={memoDraft}
                onChange={(event) => setMemoDraft(event.target.value)}
                className="h-10 w-full rounded-lg border border-[#e5e7eb] bg-white px-3 pr-10 text-sm outline-none focus:border-[#93c5fd]"
                aria-label="メモ"
              />
              {memoDraft ? (
                <button
                  type="button"
                  aria-label="メモを全削除"
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center text-[#9ca3af] hover:text-[#374151]"
                  onClick={() => setMemoDraft("")}
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Button type="button" variant="outline" className="bg-white" onClick={() => setMemoEditingTransaction(null)}>
                キャンセル
              </Button>
              <Button type="button" onClick={() => void saveMemo()}>
                保存
              </Button>
            </div>
          </div>
        </div>
      ) : null}
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
      <SelectTrigger className="h-8 w-full rounded-lg border-[#e5e7eb] bg-white px-2 text-xs sm:w-24">
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
        <SelectItem value="none">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#9ca3af]" />
            未分類
          </span>
        </SelectItem>
        {selectableCategories.map((category) => (
          <SelectItem key={category.id} value={category.id}>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: category.color }} />
              {category.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
