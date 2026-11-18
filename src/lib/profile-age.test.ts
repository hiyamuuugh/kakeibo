import { describe, expect, it } from "vitest";
import { currentAge, validBirthDate, resolveCurrentCashPlan } from "./profile-age";
import { defaultCashPlan, parseCashPlan, simulateCashPlan } from "./cash-flow-plan";
describe("profile age and current simulation start", () => {
  it("calculates full age across birthdays and next-year visits", () => {
    expect(currentAge("1998-05-20", "2026-05-19")).toBe(27);
    expect(currentAge("1998-05-20", "2026-05-20")).toBe(28);
    expect(currentAge("1998-05-20", "2027-11-18")).toBe(29);
    expect(currentAge("2000-02-29", "2027-03-01")).toBe(27);
  });
  it("rejects impossible, future or missing dates", () => {
    for (const date of ["2026-02-30", "2027-01-01", "1998/01/01", "", null]) expect(currentAge(date, "2026-11-18")).toBeNull();
    expect(validBirthDate("2024-02-29", "2026-11-18")).toBe(true);
  });
  it("uses the shared reference rather than whichever family member is viewing", () => {
    const profiles = [{ id: "a", name: "家族A", birthDate: "2000-01-01" }, { id: "b", name: "家族B", birthDate: "1998-05-20" }];
    const saved = { ...defaultCashPlan(), referenceMemberId: "b", startAge: 10, startYear: 2020 };
    expect(resolveCurrentCashPlan(saved, profiles, "2026-11-18").age).toBe(28);
    expect(resolveCurrentCashPlan(saved, profiles, "2027-11-18").age).toBe(29);
    expect(resolveCurrentCashPlan(saved, profiles, "2027-11-18").plan.startYear).toBe(2027);
  });
  it("keeps entered balances, absolute age/year rules and advances another person's anchor once", () => {
    const profiles = [{ id: "a", name: "本人", birthDate: "1998-05-20" }];
    const saved = parseCashPlan({ ...defaultCashPlan(), referenceMemberId: "a", startAge: 28, startYear: 2026, endAge: 100, initialCash: 1000000, monthlyNet: 0, rules: [
      { id: "education", name: "教育費", kind: "annual", ageAtStart: 5, flow: "expense", ranges: [{ from: 0, to: 5, amount: 100 }, { from: 6, to: null, amount: 200 }] },
      { id: "trip", name: "旅行", kind: "event", ageAtStart: null, age: 29, amount: 1000 },
    ] });
    const current = resolveCurrentCashPlan(saved, profiles, "2027-11-18").plan;
    expect(current).toMatchObject({ startAge: 29, startYear: 2027, initialCash: 1000000 });
    expect(simulateCashPlan(current, 0)[1].cash).toBe(998800);
    const next = resolveCurrentCashPlan(parseCashPlan(current), profiles, "2028-11-18").plan;
    expect(next.rules[0]).toMatchObject({ ageAtStart: 7 });
    expect(simulateCashPlan(next, 0)[1].cash).toBe(999800);
  });
  it("requires a birthday instead of silently reusing a stale age", () => {
    const result = resolveCurrentCashPlan({ ...defaultCashPlan(), startAge: 28 }, [{ id: "a", name: "本人", birthDate: null }], "2026-11-18");
    expect(result.plan.startAge).toBeNull();
  });
});
