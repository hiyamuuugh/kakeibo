"use client";
import { useEffect, useState } from "react";
import { SettingsPanel } from "@/components/settings-panel";
import { toast } from "sonner";
import { japanToday } from "@/lib/cash-flow";
import { currentAge, type AgeProfile } from "@/lib/profile-age";
import { SELECTED_MEMBER_ID_KEY } from "@/lib/member-storage";
export function ProfileSettings() {
  const [open, setOpen] = useState(false), [members, setMembers] = useState<AgeProfile[]>([]);
  const [memberId, setMemberId] = useState(""), [birthDate, setBirthDate] = useState("");
  const [saving, setSaving] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState(""), [retry, setRetry] = useState(0);
  const today = japanToday(), age = currentAge(birthDate, today);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    fetch("/api/members", { cache: "no-store", signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("プロフィールを読み込めませんでした。");
      const data: AgeProfile[] = await response.json();
      setMembers(data);
      const selected = data.find(member => member.id === localStorage.getItem(SELECTED_MEMBER_ID_KEY)) ?? data[0];
      setMemberId(selected?.id ?? ""); setBirthDate(selected?.birthDate?.slice(0, 10) ?? "");
    }).catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "読み込めませんでした。"); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);
  async function save(e: React.FormEvent) {
    e.preventDefault(); if (saving || !memberId) return;
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/members/" + encodeURIComponent(memberId), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ birthDate: birthDate || null }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "保存できませんでした。");
      setMembers(current => current.map(member => member.id === memberId ? { ...member, birthDate: data.birthDate } : member));
      toast.success("プロフィールを保存しました");
    } catch (e) { setError(e instanceof Error ? e.message : "保存できませんでした。"); }
    finally { setSaving(false); }
  }
  return <SettingsPanel title="プロフィール" open={open} onToggle={() => setOpen(value => !value)} contentId="profile-settings" className="order-1">
      {loading ? <p className="text-sm text-muted-foreground">読み込み中…</p> : !members.length ? <p className="text-sm text-muted-foreground">アカウントを作成してから登録してください。</p> : <form onSubmit={save}><fieldset disabled={saving} className="space-y-4">
        <label className="block text-sm">プロフィール<select aria-label="編集するプロフィール" value={memberId} onChange={e => { setMemberId(e.target.value); setBirthDate(members.find(member => member.id === e.target.value)?.birthDate?.slice(0, 10) ?? ""); setError(""); }} className="mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-base">{members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
        <label className="block text-sm">生年月日<input type="date" min="1900-01-01" max={today} value={birthDate} onChange={e => setBirthDate(e.target.value)} className="mt-1.5 w-full min-w-0 rounded-lg border border-border bg-white px-3 py-2.5 text-base" /></label>
        {age !== null && <p className="text-sm">現在の年齢：{age}歳</p>}
        <p className="text-xs leading-5 text-muted-foreground">キャッシュフローの開始年齢を、その時点の満年齢で自動計算します。家族共通の画面では、基本設定で選んだプロフィールを基準にします。</p>
        <button className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white">{saving ? "保存中…" : "プロフィールを保存"}</button>
      </fieldset></form>}
      {error && <div role="alert" className="mt-3 text-sm text-destructive">{error}{loading || members.length ? null : <button type="button" onClick={() => setRetry(value => value + 1)} className="ml-2 underline">再読み込み</button>}</div>}
  </SettingsPanel>;
}
