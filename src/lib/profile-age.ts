import type { CashPlan } from "./cash-flow-plan";
export type AgeProfile = { id: string; name: string; birthDate?: string | null };
export function validBirthDate(value: unknown, today: string): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < "1900-01-01" || value > today) return false;
  const date = new Date(value + "T00:00:00.000Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function currentAge(birthDate: string | null | undefined, today: string) {
  const date = birthDate?.slice(0, 10);
  if (!validBirthDate(date, today)) return null;
  return Number(today.slice(0, 4)) - Number(date.slice(0, 4)) - (today.slice(5) < date.slice(5) ? 1 : 0);
}
export function resolveCurrentCashPlan(saved: CashPlan, profiles: AgeProfile[], today: string) {
  const member = saved.referenceMemberId ? profiles.find(profile => profile.id === saved.referenceMemberId) : profiles.find(profile => currentAge(profile.birthDate, today) !== null) ?? profiles[0];
  const age = currentAge(member?.birthDate, today);
  const year = Number(today.slice(0, 4)), elapsed = year - (saved.startYear ?? year);
  const rules = saved.rules.map(rule => rule.kind !== "investment" && rule.basis !== "year" && rule.ageAtStart !== null ? { ...rule, ageAtStart: rule.ageAtStart + elapsed } : rule);
  const plan: CashPlan = { ...saved, ...(member ? { referenceMemberId: member.id } : {}), startAge: age, startYear: year, endAge: age === null ? saved.endAge : Math.max(age, saved.endAge), rules };
  return { plan, member, age };
}
