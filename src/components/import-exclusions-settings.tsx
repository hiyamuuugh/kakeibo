"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { csvImportSources, type CsvImportSource } from "@/lib/import-sources";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";

type Exclusion = { id: string; name: string; source: CsvImportSource };

export function ImportExclusionsSettings() {
  const [items, setItems] = useState<Exclusion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    fetch("/api/import-exclusions", { cache: "no-store", signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("除外名称を読み込めませんでした");
        setItems(await response.json());
      })
      .catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "読み込めませんでした"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);
  return <Card className="order-3">
    <button type="button" aria-expanded={open} aria-controls="csv-exclusion-sources" onClick={() => setOpen(value => !value)} className="flex w-full items-center justify-between p-4 text-left">
      <CardTitle className="text-sm font-semibold">CSV取込の除外名称</CardTitle>
      {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
    </button>
    {open && <CardContent id="csv-exclusion-sources" className="space-y-3 border-t border-border pt-3">
      <p className="text-xs leading-5 text-muted-foreground">名称を含む明細を、選んだ取り込み元のCSVから除外します。登録済みの家計簿は変更しません。</p>
      {loading ? <p role="status" className="py-3 text-center text-sm text-muted-foreground">読み込み中…</p> : error ? <div role="alert"><p className="text-sm text-destructive">{error}</p><Button variant="outline" className="mt-2" onClick={() => setRetry(value => value + 1)}>再読み込み</Button></div> :
        csvImportSources.map(source => <SourceExclusions key={source.id} source={source.id} label={source.label} items={items.filter(item => item.source === source.id)} onAdd={item => setItems(current => [...current, item])} onDelete={id => setItems(current => current.filter(item => item.id !== id))} />)}
    </CardContent>}
  </Card>;
}

function SourceExclusions({ source, label, items, onAdd, onDelete }: { source: CsvImportSource; label: string; items: Exclusion[]; onAdd: (item: Exclusion) => void; onDelete: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(0);
  const count = Math.max(1, Math.ceil(items.length / 10)), safePage = Math.min(page, count - 1);
  const visible = [...items].sort((a, b) => a.name.localeCompare(b.name, "ja")).slice(safePage * 10, safePage * 10 + 10);
  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !name.trim()) return;
    setBusy(true);
    try {
      const response = await fetch("/api/import-exclusions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), source }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "登録できませんでした");
      onAdd(data); setName(""); setPage(0); toast.success(label + "の除外名称を登録しました");
    } catch (e) { toast.error(e instanceof Error ? e.message : "登録できませんでした"); }
    finally { setBusy(false); }
  }
  async function remove(item: Exclusion) {
    if (busy || !window.confirm(label + "の「" + item.name + "」を除外名称から削除しますか？")) return;
    setBusy(true);
    try {
      const response = await fetch("/api/import-exclusions", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, source }) });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || "削除できませんでした"); }
      onDelete(item.id); toast.success("除外名称を削除しました");
    } catch (e) { toast.error(e instanceof Error ? e.message : "削除できませんでした"); }
    finally { setBusy(false); }
  }
  return <section className="rounded-xl border border-border">
    <button type="button" aria-expanded={open} aria-controls={"csv-exclusion-" + source} onClick={() => setOpen(value => !value)} className="flex w-full items-center gap-2 p-3 text-left text-sm font-semibold">
      {open ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
      <span className="min-w-0 flex-1">{label}</span><span className="text-xs text-muted-foreground">{items.length}件</span>
    </button>
    <div id={"csv-exclusion-" + source} hidden={!open} className="space-y-3 border-t border-border p-3">
      <form onSubmit={add} className="flex gap-2"><input aria-label={label + "で除外する名称"} value={name} onChange={e => setName(e.target.value)} required maxLength={200} placeholder="除外する名称" disabled={busy} className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring" /><Button type="submit" disabled={busy || !name.trim()} className="h-10 shrink-0">追加</Button></form>
      {!items.length ? <p className="py-2 text-center text-xs text-muted-foreground">登録名称がありません</p> : visible.map(item => <div key={item.id} className="flex items-center gap-2 rounded-lg bg-background px-3 py-2"><span className="min-w-0 flex-1 break-words text-sm">{item.name}</span><Button type="button" variant="ghost" size="icon" disabled={busy} aria-label={label + "の「" + item.name + "」を削除"} onClick={() => void remove(item)} className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></div>)}
      {count > 1 && <div className="flex items-center justify-between"><Button type="button" variant="outline" size="sm" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>前へ</Button><span className="text-xs text-muted-foreground">{safePage + 1} / {count}</span><Button type="button" variant="outline" size="sm" disabled={safePage >= count - 1} onClick={() => setPage(safePage + 1)}>次へ</Button></div>}
    </div>
  </section>;
}
