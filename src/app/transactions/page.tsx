"use client";

import { useCallback, useEffect, useState } from "react";
import { addMonths, format, subMonths } from "date-fns";
import { ja } from "date-fns/locale";
import { Eye, EyeOff, MessageSquare, Trash2 } from "lucide-react";
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

const SOURCE_LABELS: Record<string, string> = {
  paypay: "PayPay",
  paypay_card: "PayPayカード",
  rakuten: "楽天カード",
  mufg: "三菱UFJ",
  smbc: "三井住友",
  manual: "手入力",
  credit: "クレカ",
};

const SOURCE_COLORS: Record<string, string> = {
  paypay: "#ef4444",
  paypay_card: "#f59e0b",
  rakuten: "#bf0000",
  mufg: "#dc2626",
  smbc: "#16a34a",
  manual: "#64748b",
  credit: "#8b5cf6",
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

const SOURCE_ORDER = ["paypay", "rakuten", "paypay_card", "mufg", "smbc", "manual"];

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
    setMonth(value);
  };

  const goToPrevMonth = () => handleMonthChange(format(subMonths(new Date(`${month}-01`), 1), "yyyy-MM"));
  const goToNextMonth = () => handleMonthChange(format(addMonths(new Date(`${month}-01`), 1), "yyyy-MM"));

  const handleFilterChange = (value: string) => {
    setLoading(true);
    setFilterCat(value);
  };

  const handleMemberFilterChange = (value: string) => {
    setFilterMember(value);
  };

  const handleViewModeChange = (mode: "personal" | "family") => {
    setViewMode(mode);
    setFilterMember("all");
    setLoading(true);
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
    const nextMemo = window.prompt("メモ", transaction.memo ?? "");
    if (nextMemo === null) return;

    const response = await fetch(`/api/transactions/${transaction.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memo: nextMemo.trim() || null }),
    });

    if (response.ok) {
      setTransactions((current) =>
        current.map((item) =>
          item.id === transaction.id ? { ...item, memo: nextMemo.trim() || null } : item
        )
      );
      toast.success(nextMemo.trim() ? "メモを保存しました" : "メモを削除しました");
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

  const categoryPicker = (
    <div className={filterShellClass}>
      <span className={filterLabelClass}>カテゴリ</span>
      <Select value={filterCat} onValueChange={(value) => handleFilterChange(value ?? "all")}>
        <SelectTrigger className="h-9 min-w-0 flex-1 border-0 bg-transparent px-2 text-xs shadow-none focus:ring-0">
          <span data-slot="select-value" className="flex flex-1 text-left">
            {getFilterLabel(filterCat, categories)}
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">すべて</SelectItem>
          <SelectItem value="uncategorized">未分類</SelectItem>
          {filterCategories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="space-y-3 rounded-xl border-b border-[#e5e7eb] bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="grid grid-cols-[40px,1fr,40px] items-center gap-2">
          <button
            type="button"
            onClick={goToPrevMonth}
            className="flex h-10 w-10 items-center justify-center justify-self-start text-xl font-light leading-none text-[#3b82f6]"
          >
            〈
          </button>
          <div className="min-w-0 text-center">
            <label className="relative inline-flex h-10 items-center justify-center cursor-pointer text-xl font-bold text-[#1f2937]">
              <span>{monthLabel}</span>
              <input
                type="month"
                value={month}
                onChange={(event) => handleMonthChange(event.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
            <p className={`text-lg font-extrabold leading-tight ${getTotalColor(total)}`}>
              {formatSignedYen(total)}
            </p>
          </div>
          <button
            type="button"
            onClick={goToNextMonth}
            className="flex h-10 w-10 items-center justify-center justify-self-end text-xl font-light leading-none text-[#3b82f6]"
          >
            〉
          </button>
        </div>
        <div className="grid grid-cols-2 rounded-lg bg-[#e5e7eb] p-0.5">
          <button
            type="button"
            onClick={() => handleViewModeChange("personal")}
            className={`rounded-md py-1.5 text-xs font-bold ${
              viewMode === "personal" ? "bg-white text-[#1f2937] shadow-sm" : "text-[#6b7280]"
            }`}
          >
            自分
          </button>
          <button
            type="button"
            onClick={() => handleViewModeChange("family")}
            className={`rounded-md py-1.5 text-xs font-bold ${
              viewMode === "family" ? "bg-white text-[#1f2937] shadow-sm" : "text-[#6b7280]"
            }`}
          >
            家族全員
          </button>
        </div>
        <div>
          <input
            type="search"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="キーワード検索"
            className="h-9 w-full rounded-lg border border-[#e5e7eb] bg-white px-3 text-sm outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className={filterShellClass}>
            <span className={filterLabelClass}>収支</span>
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
            <span className={filterLabelClass}>取込元</span>
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
        <div className={viewMode === "family" ? "grid grid-cols-2 gap-2" : "grid grid-cols-1 gap-2"}>
          {categoryPicker}
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
          ) : null}
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
                  読み込み中...
                </TableCell>
              </TableRow>
            ) : visibleTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-slate-400">
                  取引データがありません
                </TableCell>
              </TableRow>
            ) : (
              visibleTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
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
          visibleTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className="space-y-1.5 rounded-[10px] bg-white p-2.5 shadow-[0_2px_10px_rgba(0,0,0,0.04)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
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
                <div className="ml-1 w-28 shrink-0">
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
      <SelectTrigger className="h-8 w-full rounded-lg border-[#e5e7eb] bg-white px-2 text-xs sm:w-36">
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
