import { expect, it } from "vitest";
import { budgetManInputToYen, budgetYenToManInput } from "./monthly-budget";
it.each([["25", 250000], ["3.5", 35000], ["0", 0], ["0.0001", 1], ["0.0013", 13], [".5", 5000], ["214748.3647", 2147483647]])("converts %s万円 to %s yen exactly", (input, yen) => {
  expect(budgetManInputToYen(input)).toBe(yen);
  expect(budgetManInputToYen(budgetYenToManInput(yen))).toBe(yen);
});
it.each(["", "-1", "1.00001", "NaN", "Infinity", "1e3", "214748.3648"])("rejects invalid or fractional-yen input: %s", input => {
  expect(() => budgetManInputToYen(input)).toThrow();
});
