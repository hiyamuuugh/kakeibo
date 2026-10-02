"use client";

import { useEffect, useState } from "react";
import { format, subMonths } from "date-fns";
import { ja } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface CategoryStat {
  id: string;
  name: string;
  color: string;
  total: number;
  count: number;
}

interface MonthlyStats {
  month: string;
  total: number;
  categories: CategoryStat[];
  daily: { date: string; amount: number }[];
  count: number;
}

const formatYen = (amount: number) => `¥${amount.toLocaleString("ja-JP")}`;

function MonthPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      type="month"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
    />
  );
}

export default function Dashboard() {
  const [month, setMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [prevStats, setPrevStats] = useState<MonthlyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const prevMonth = format(subMonths(new Date(`${month}-01`), 1), "yyyy-MM");

    Promise.all([
      fetch(`/api/stats/monthly?month=${month}`).then((response) =>
        response.json()
      ),
      fetch(`/api/stats/monthly?month=${prevMonth}`).then((response) =>
        response.json()
      ),
    ]).then(([current, previous]) => {
      setStats(current);
      setPrevStats(previous);
      setLoading(false);
    });
  }, [month]);

  const handleMonthChange = (value: string) => {
    setLoading(true);
    setMonth(value);
  };

  const diff = stats && prevStats ? stats.total - prevStats.total : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-[#6b7280]">家族のお金の流れ</p>
          <h1 className="text-xl font-bold text-[#1f2937]">ダッシュボード</h1>
        </div>
        <MonthPicker value={month} onChange={handleMonthChange} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[11px] font-medium text-[#6b7280]">
              {format(new Date(`${month}-01`), "M月", { locale: ja })}の支出合計
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-extrabold tracking-tight text-[#1f2937]">
              {loading ? "..." : formatYen(stats?.total ?? 0)}
            </p>
            {diff !== null ? (
              <p
                className={`mt-2 text-sm ${diff > 0 ? "text-red-500" : "text-emerald-600"}`}
              >
                前月比 {diff > 0 ? "+" : ""}
                {formatYen(diff)}
              </p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[11px] font-medium text-[#6b7280]">
              取引件数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-extrabold tracking-tight text-[#1f2937]">
              {loading ? "..." : stats?.count ?? 0}
              <span className="ml-1 text-base font-normal text-slate-500">件</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[11px] font-medium text-[#6b7280]">
              1日平均
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-extrabold tracking-tight text-[#1f2937]">
              {loading || !stats
                ? "..."
                : formatYen(
                    stats.daily.length > 0
                      ? Math.round(stats.total / stats.daily.length)
                      : 0
                  )}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">カテゴリ別の支出</CardTitle>
          </CardHeader>
          <CardContent>
            {!loading && stats && stats.categories.length > 0 ? (
              <div className="flex flex-col gap-4">
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.categories}
                        dataKey="total"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={78}
                      >
                        {stats.categories.map((category) => (
                          <Cell key={category.id} fill={category.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) =>
                          typeof value === "number" ? formatYen(value) : String(value)
                        }
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {stats.categories.slice(0, 6).map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="flex min-w-0 items-center gap-2 text-[#374151]">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: category.color }}
                        />
                        <span className="truncate">{category.name}</span>
                      </span>
                      <span className="shrink-0 font-semibold text-[#1f2937]">
                        {formatYen(category.total)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="py-10 text-center text-sm text-[#9ca3af]">
                データがありません
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">日別の支出</CardTitle>
          </CardHeader>
          <CardContent>
            {!loading && stats && stats.daily.length > 0 ? (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.daily} margin={{ left: -28, right: 8, top: 8 }}>
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => String(new Date(value).getDate())}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      tickFormatter={(value) => `¥${Math.round(value / 1000)}k`}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value) =>
                        typeof value === "number" ? formatYen(value) : String(value)
                      }
                    />
                    <Bar dataKey="amount" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-10 text-center text-sm text-[#9ca3af]">
                データがありません
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
