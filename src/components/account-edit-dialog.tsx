"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { japanToday } from "@/lib/cash-flow";
import { currentAge } from "@/lib/profile-age";

export interface AccountProfile { id: string; name: string; color: string; birthDate?: string | null }
export function AccountEditDialog({ member, onClose, onSaved }: { member: AccountProfile; onClose: () => void; onSaved: (member: AccountProfile) => void }) {
  const [color, setColor] = useState(/^#[0-9a-f]{6}$/i.test(member.color) ? member.color : "#245f8b");
  const [birthDate, setBirthDate] = useState(member.birthDate?.slice(0, 10) ?? "");
  const [saving, setSaving] = useState(false), [error, setError] = useState("");
  const today = japanToday(), age = currentAge(birthDate, today);
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (saving) return;
    setSaving(true); setError("");
    try {
      const response = await fetch(`/api/members/${encodeURIComponent(member.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ color, birthDate: birthDate || null }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "アカウントを保存できませんでした。");
      onSaved(data); toast.success("アカウントを保存しました");
      window.dispatchEvent(new Event("kakeibo:profile-updated"));
    } catch (e) { setError(e instanceof Error ? e.message : "保存できませんでした。"); }
    finally { setSaving(false); }
  }
  return <Dialog open onOpenChange={next => { if (!next && !saving) onClose(); }}>
    <DialogContent showCloseButton={!saving} className="max-h-[85dvh] overflow-y-auto">
      <DialogTitle>{member.name}の編集</DialogTitle>
      <DialogDescription>アカウントの色と生年月日を設定します。</DialogDescription>
      <form onSubmit={save}><fieldset disabled={saving} className="space-y-4">
        <label className="block text-sm font-semibold">色<input aria-label="色" type="color" required value={color} onChange={e => setColor(e.target.value)} className="mt-2 block h-11 w-full rounded-lg border border-border bg-white p-1" /></label>
        <label className="block text-sm">生年月日(任意)<input aria-label="生年月日(任意)" type="date" min="1900-01-01" max={today} value={birthDate} onChange={e => setBirthDate(e.target.value)} className="mt-2 w-full min-w-0 rounded-lg border border-border bg-white px-3 py-2.5 text-base" /></label>
        {age !== null && <p className="text-sm">現在の年齢：{age}歳</p>}
        <p className="text-xs leading-5 text-muted-foreground">キャッシュフローの開始年齢は、生年月日から自動計算します。</p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2.5 text-sm">キャンセル</button><button className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white">{saving ? "保存中…" : "保存"}</button></div>
      </fieldset></form>
    </DialogContent>
  </Dialog>;
}
