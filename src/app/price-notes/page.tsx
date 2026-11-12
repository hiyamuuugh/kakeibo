"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, ChevronRight, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { cheapest, unitLabel, units, type PriceProduct } from "@/lib/price-notes";

const yen = (n: number) => n.toLocaleString("ja-JP");
const field = "mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-ring";
const primary = "inline-flex items-center justify-center gap-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50";
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

export default function PriceNotesPage() {
  const [products, setProducts] = useState<PriceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("すべて");
  const [sort, setSort] = useState("recent");
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<PriceProduct | null>(null);
  const [formSession, setFormSession] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const formDialog = useRef<HTMLDialogElement>(null);
  const detailDialog = useRef<HTMLDialogElement>(null);
  const current = products.find(p => p.id === selected);

  async function load() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/price-notes", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "読み込めませんでした。");
      setProducts(data);
    } catch (e) { setError(e instanceof Error ? e.message : "読み込めませんでした。"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  function openForm(product: PriceProduct | null = null) {
    detailDialog.current?.close(); setFormSession(n => n + 1); setDraft(product); setFormError(""); formDialog.current?.showModal();
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (saving) return;
    const f = new FormData(event.currentTarget);
    setSaving(true); setFormError("");
    try {
      const res = await fetch("/api/price-notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: f.get("name"), category: f.get("category"), store: f.get("store"), quantity: Number(f.get("quantity")), unit: f.get("unit"), price: Number(f.get("price")), shipping: Number(f.get("shipping")), online: f.get("online") === "online", date: f.get("date") }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || "保存できませんでした。");
      setProducts(old => [data, ...old.filter(p => p.id !== data.id)]);
      formDialog.current?.close(); toast.success("価格を記録しました");
    } catch (e) { setFormError(e instanceof Error ? e.message : "保存できませんでした。"); }
    finally { setSaving(false); }
  }
  async function remove(id: string) {
    if (!window.confirm("この価格の記録を削除しますか？")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/price-notes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("削除できませんでした。");
      setProducts(old => old.map(p => ({ ...p, records: p.records.filter(r => r.id !== id) })));
      toast.success("記録を削除しました");
    } catch { toast.error("削除できませんでした。もう一度お試しください。"); }
    finally { setDeleting(null); }
  }
  const visible = products.filter(p => p.records.length && (category === "すべて" || p.category === category || (category === "ネット購入" && p.records.some(r => r.online))) && `${p.name} ${p.records.map(r => r.store).join(" ")}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name, "ja");
    if (sort === "low") return (cheapest(a.records).price + cheapest(a.records).shipping) - (cheapest(b.records).price + cheapest(b.records).shipping);
    const last = (p: PriceProduct) => Math.max(...p.records.map(r => Date.parse(r.createdAt)));
    return last(b) - last(a);
  });
  return <div className="mx-auto max-w-3xl">
    <div className="mb-4 flex justify-end"><button className={primary} onClick={() => openForm()}><Plus className="h-4 w-4" />追加</button></div>
    <section className="overflow-hidden rounded-2xl border border-border bg-white">
      <div className="px-4 pt-6 sm:px-7">
        <div className="flex items-center justify-between gap-2"><h1 className="text-lg font-bold sm:text-xl">わが家の底値帖 <span className="ml-2 text-xs font-normal text-muted-foreground">{products.filter(p => p.records.length).length} 商品</span></h1><span className="text-[10px] text-muted-foreground sm:text-xs">税込・送料込み</span></div>
        <div className="my-6 flex gap-2 sm:gap-4"><div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" /><input aria-label="商品名・お店で検索" placeholder="商品名・お店で探す" value={query} onChange={e => setQuery(e.target.value)} className={`${field} mt-0 bg-background pl-9`} /></div><select aria-label="並び順" className="min-w-0 rounded-lg border border-border bg-white px-2 text-xs sm:text-sm" value={sort} onChange={e => setSort(e.target.value)}><option value="recent">最近の記録順</option><option value="low">価格が安い順</option><option value="name">商品名順</option></select></div>
        <div className="flex gap-5 border-b border-border sm:gap-8" aria-label="カテゴリー">{["すべて", "食品", "日用品", "ネット購入"].map(c => <button key={c} aria-pressed={category === c} onClick={() => setCategory(c)} className={`border-b-2 pb-4 text-xs sm:text-sm ${category === c ? "border-primary font-semibold text-primary" : "border-transparent text-muted-foreground"}`}>{c}</button>)}</div>
      </div>
      {loading && <p className="p-12 text-center text-sm text-muted-foreground" role="status">読み込み中…</p>}
      {error && <div className="p-8 text-center" role="alert"><p className="mb-4 text-sm text-destructive">{error}</p><button className={primary} onClick={() => void load()}>再読み込み</button></div>}
      {!loading && !error && !visible.length && <div className="px-6 py-16 text-center text-muted-foreground"><BookOpen className="mx-auto mb-4 h-8 w-8" /><p className="text-sm">{products.some(p => p.records.length) ? "条件に合う商品がありません。" : "まだ価格の記録がありません。"}</p><p className="mt-2 text-xs">「追加」から商品・お店・買った価格を記録できます。</p></div>}
      {!loading && !error && visible.map(p => { const best = cheapest(p.records); return <button key={p.id} onClick={() => { setSelected(p.id); detailDialog.current?.showModal(); }} className="grid w-full grid-cols-[minmax(0,1fr)_86px_66px_10px] items-center gap-2 border-b border-border px-3 py-6 text-left last:border-0 hover:bg-background sm:grid-cols-[minmax(0,1fr)_140px_110px_16px] sm:gap-4 sm:px-6 sm:py-8">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4"><div className="flex h-14 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f4f1e8] text-2xl sm:h-20 sm:w-16 sm:text-3xl">{p.category === "食品" ? "🛒" : "🧴"}</div><div className="min-w-0"><p className="break-words text-xs font-semibold leading-6 sm:text-sm">{p.name}</p><p className="mt-2 text-[10px] text-muted-foreground sm:text-xs">{yen(best.quantity)}{p.unit} · {p.category}</p></div></div>
        <div><p className="text-xl font-semibold sm:text-3xl"><span className="mr-1 text-xs sm:text-base">¥</span>{yen(best.price + best.shipping)}</p><p className="mt-2 text-[10px] leading-5 text-muted-foreground sm:text-xs">{unitLabel(p.unit, best)}</p></div><div className="min-w-0"><span className="inline-block rounded bg-[#edf3e8] px-2 py-1 text-[10px] text-[#527346] sm:text-xs">最安単価</span><p className="mt-2 break-words text-[10px] text-muted-foreground sm:text-xs">{best.store}</p></div><ChevronRight className="h-4 w-3 text-muted-foreground" />
      </button>; })}
    </section>
    <dialog ref={formDialog} className="m-auto max-h-[90dvh] w-[calc(100%_-_24px)] max-w-lg overflow-y-auto rounded-2xl bg-white p-5 text-foreground shadow-xl backdrop:bg-black/40 sm:p-7" aria-labelledby="record-title" onCancel={e => { if (saving) e.preventDefault(); }}>
      <div className="mb-5 flex items-center justify-between"><h2 id="record-title" className="text-lg font-bold">価格を記録</h2><button aria-label="閉じる" disabled={saving} onClick={() => formDialog.current?.close()}><X className="h-5 w-5" /></button></div>
      <form key={formSession} onSubmit={save} className="space-y-4">
        <fieldset disabled={saving} className="space-y-4">
          <label className="block text-sm">商品名<input name="name" required maxLength={120} list="product-names" defaultValue={draft?.name} placeholder="例：北海道牛乳" className={field} /></label><datalist id="product-names">{[...new Set(products.map(p => p.name))].map(n => <option key={n} value={n} />)}</datalist>
          <label className="block text-sm">カテゴリー<select name="category" defaultValue={draft?.category ?? "食品"} className={field}><option>食品</option><option>日用品</option></select></label>
          <div className="grid grid-cols-2 gap-3"><label className="block text-sm">内容量<input name="quantity" type="number" min="0.001" max="1000000" step="any" required placeholder="例：1000" className={field} /></label><label className="block text-sm">単位<select name="unit" defaultValue={draft?.unit ?? "ml"} className={field}>{units.map(u => <option key={u}>{u}</option>)}</select></label></div>
          <p className="text-xs leading-5 text-muted-foreground">同じ商品名・カテゴリー・単位の記録を比較します。kgとg、Lとmlは自動で換算します。セット商品は合計の内容量を入力してください。</p>
          <label className="block text-sm">お店<input name="store" required maxLength={120} placeholder="例：イオン" className={field} /></label>
          <label className="block text-sm">購入先<select name="online" className={field}><option value="store">実店舗</option><option value="online">ネット通販</option></select></label>
          <div className="grid grid-cols-2 gap-3"><label className="block text-sm">税込価格（円）<input type="number" name="price" required min="1" max="100000000" step="1" className={field} /></label><label className="block text-sm">送料（円）<input type="number" name="shipping" required min="0" max="100000000" step="1" defaultValue="0" className={field} /></label></div>
          <label className="block text-sm">購入日<input type="date" name="date" required defaultValue={today()} className={field} /></label>
        </fieldset>
        {formError && <p className="text-sm text-destructive" role="alert">{formError}</p>}
        <div className="flex justify-end gap-3 pt-2"><button type="button" disabled={saving} onClick={() => formDialog.current?.close()} className="rounded-lg border border-border px-4 py-2 text-sm">キャンセル</button><button disabled={saving} className={primary}>{saving ? "保存中…" : "記録する"}</button></div>
      </form>
    </dialog>
    <dialog ref={detailDialog} className="m-auto max-h-[85dvh] w-[calc(100%_-_24px)] max-w-lg overflow-y-auto rounded-2xl bg-white p-6 text-foreground shadow-xl backdrop:bg-black/40" aria-labelledby="history-title">
      <div className="mb-5 flex items-center justify-between gap-3"><h2 id="history-title" className="text-lg font-bold">{current?.name ?? "購入履歴"}</h2><button aria-label="閉じる" onClick={() => detailDialog.current?.close()}><X className="h-5 w-5" /></button></div>
      <p className="mb-4 text-xs text-muted-foreground">単価の安い順 · 税込・送料込み</p>
      {current && [...current.records].sort((a, b) => (a.price + a.shipping) / a.quantity - (b.price + b.shipping) / b.quantity).map(r => <div key={r.id} className="flex items-center justify-between gap-4 border-t border-border py-4"><div className="min-w-0"><p className="break-words text-sm font-semibold">{r.store} <span className="text-xs font-normal text-muted-foreground">{r.online ? "ネット" : "実店舗"}</span></p><p className="mt-1 text-xs text-muted-foreground">{r.date.slice(0, 10)} · {yen(r.quantity)}{current.unit}</p><p className="mt-1 text-xs text-muted-foreground">税込 ¥{yen(r.price)} ＋ 送料 ¥{yen(r.shipping)}</p><button disabled={deleting !== null} onClick={() => void remove(r.id)} className="mt-2 text-xs text-destructive underline disabled:opacity-50">{deleting === r.id ? "削除中…" : "記録を削除"}</button></div><div className="shrink-0 text-right"><p className="text-xl font-semibold">¥{yen(r.price + r.shipping)}</p><p className="mt-1 text-xs text-muted-foreground">{unitLabel(current.unit, r)}</p></div></div>)}
      {current && !current.records.length && <p className="py-6 text-sm text-muted-foreground">記録がありません。</p>}
      <button className={`${primary} mt-5 w-full`} onClick={() => openForm(current ?? null)}>この商品の価格を追加</button>
    </dialog>
  </div>;
}
