"use client";

import { useEffect, useState } from "react";
import { format, subMonths } from "date-fns";
import { ja } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
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

function MonthPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="month"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border rounded-md px-3 py-1.5 text-sm"
    />
  );
}

function formatYen(n: number) {
  return `¥${n.toLocaleString("ja-JP")}`;
}

export default function Dashboard() {
  const [month, setMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [prevStats, setPrevStats] = useState<MonthlyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const prevMonth = format(subMonths(new Date(month + "-01"), 1), "yyyy-MM");
    Promise.all([
      fetch(`/api/stats/monthly?month=${month}`).then((r) => r.json()),
      fetch(`/api/stats/monthly?month=${prevMonth}`).then((r) => r.json()),
    ]).then(([cur, prev]) => {
      setStats(cur);
      setPrevStats(prev);
      setLoading(false);
    });
  }, [month]);

  const diff =
    stats && prevStats ? stats.total - prevStats.total : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <MonthPicker value={month} onChange={setMonth} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              {format(new Date(month + "-01"), "M月", { locale: ja })}の支出合計
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {loading ? "…" : formatYen(stats?.total ?? 0)}
            </p>
            {diff !== null && (
              <p
                className={`text-sm mt-1 ${diff > 0 ? "text-red-500" : "text-green-600"}`}
              >
                前月比 {diff > 0 ? "+" : ""}
                {formatYen(diff)}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              取引件数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {loading ? "…" : stats?.count ?? 0}
              <span className="text-base font-normal text-gray-500 ml-1">件</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              1日平均
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {loading || !stats
                ? "…"
                : formatYen(
                    stats.daily.length
                      ? Math.round(stats.total / stats.daily.length)
                      : 0
                  )}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category pie chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">カテゴリ別支出</CardTitle>
          </CardHeader>
          <CardContent>
            {!loading && stats && stats.categories.length > 0 ? (
              <div className="flex flex-col gap-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={stats.categories}
                      dataKey="total"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                    >
                      {stats.categories.map((cat) => (
                        <Cell key={cat.id} fill={cat.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v) => typeof v === "number" ? formatYen(v) : String(v)}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1">
                  {stats.categories.slice(0, 6).map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block"
                          style={{ background: cat.color }}
                        />
                        {cat.name}
                      </span>
                      <span className="font-medium">{formatYen(cat.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-sm text-center py-8">
                データなし
              </p>
            )}
          </CardContent>
        </Card>

        {/* Daily bar chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">日別支出</CardTitle>
          </CardHeader>
          <CardContent>
            {!loading && stats && stats.daily.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={stats.daily} margin={{ left: -20 }}>
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => String(new Date(v).getDate())}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip formatter={(v) => typeof v === "number" ? formatYen(v) : String(v)} />
                  <Bar dataKey="amount" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-sm text-center py-8">
                データなし
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
