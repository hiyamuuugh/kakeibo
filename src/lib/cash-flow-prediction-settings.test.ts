import { describe, expect, it } from "vitest";
import { defaultPredictionSettings, parsePredictionSettings, predictionInstructionText, summarizePredictionSettings } from "./cash-flow-prediction-settings";
import { buildCashFlowHistory } from "./cash-flow-history";
import { learnCashFlowPrediction } from "./cash-flow-prediction";
describe("prediction instructions", () => {
  it("applies supported month and income/expense instructions including line breaks", () => {
    expect(parsePredictionSettings({ ...defaultPredictionSettings(), instructions: "過去１２か月を考慮して。\n収入を5%減らす。支出を10%増やす。" })).toMatchObject({ lookbackMonths: 12, incomeChange: -5, expenseChange: 10 });
  });
  it("rejects unsupported or contradictory instructions and invalid bounds", () => {
    for (const instructions of ["65歳で退職する", "過去6か月。過去12か月。", "支出を5%増やす。支出を10%減らす。", "過去2か月", "支出を101%増やす"]) expect(() => parsePredictionSettings({ ...defaultPredictionSettings(), instructions })).toThrow();
    expect(() => parsePredictionSettings({ ...defaultPredictionSettings(), lookbackMonths: 121 })).toThrow();
  });
  it("preserves legacy numeric settings in the text-only editor", () => {
    const legacy = { ...defaultPredictionSettings(), lookbackMonths: 6, incomeChange: -5, expenseChange: 10 };
    const instructions = predictionInstructionText(legacy);
    expect(parsePredictionSettings({ ...defaultPredictionSettings(), instructions })).toEqual({ ...legacy, instructions });
    expect(summarizePredictionSettings(legacy)).toEqual(["今月を除く過去6か月の、記録がある月を学習する", "収入は予測額から5% 減らす", "支出は予測額から10% 増やす"]);
  });
  it("summarizes zero adjustments explicitly and retains original saved wording", () => {
    expect(summarizePredictionSettings(defaultPredictionSettings())).toContain("収入は予測額をそのまま使う");
    expect(predictionInstructionText({ ...defaultPredictionSettings(), instructions: "過去12か月を使う。" })).toBe("過去12か月を使う。");
  });
  it("limits the calendar history window and applies corrections to the learned amounts", () => {
    const entries = Array.from({ length: 6 }, (_, i) => [{ date: `2026-0${i + 1}-01`, amount: -300000 }, { date: `2026-0${i + 1}-02`, amount: 100000 }]).flat();
    const history = buildCashFlowHistory(entries, "2026-07-01");
    const settings = parsePredictionSettings({ ...defaultPredictionSettings(), instructions: "過去3か月。支出を10%増やす。" });
    const prediction = learnCashFlowPrediction(history, settings);
    if (!prediction.available) throw Error("unavailable");
    expect(prediction.months.map(month => month.month)).toEqual(["2026-04", "2026-05", "2026-06"]);
    expect(prediction.forecast[0]).toMatchObject({ income: 300000, expense: 110000, net: 190000 });
    expect(prediction.averageNet).toBe(190000);
  });
});
