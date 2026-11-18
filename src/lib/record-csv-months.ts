import { prisma } from "./prisma";
import { csvImportScope, csvMonth } from "./csv-import-status";
import type { CsvImportSource } from "./import-sources";
/** Record valid months only after processing the entire CSV successfully. */
export async function recordCsvMonths(source: CsvImportSource, memberId: string | null, dates: (Date | null)[]) {
  const months = [...new Set(dates.filter((date): date is Date => date !== null && !Number.isNaN(date.getTime())).map(csvMonth).filter((month): month is string => month !== null))];
  if (!months.length) return;
  await prisma.csvImportMonth.createMany({ data: months.map(month => ({ source, memberScope: csvImportScope(memberId), month })), skipDuplicates: true });
}
