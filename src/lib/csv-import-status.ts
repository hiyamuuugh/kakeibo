import { monthAt, validMonth } from "./cash-flow";
import { csvImportSources, isCsvImportSource } from "./import-sources";
export const csvImportScope = (memberId: string | null) => memberId ? "member:" + memberId : "unassigned";
export function csvSourceId(source: string) {
  const id = source === "paypay_card" ? "paypay-card" : source;
  return isCsvImportSource(id) ? id : null;
}
export function csvMonth(date: Date | string) {
  const month = (date instanceof Date ? date.toISOString() : date).slice(0, 7);
  return validMonth(month) ? month : null;
}
export function buildCsvImportStatus(today: string, records: { source: string; date: Date | string }[], logs: { source: string; month: string }[], usedSources: string[]) {
  const currentMonth = today.slice(0, 7);
  const months = Array.from({ length: 6 }, (_, i) => monthAt(currentMonth, i - 6));
  const active = new Set([...usedSources, ...logs.map(log => log.source), ...records.map(record => record.source)].map(csvSourceId).filter((source): source is NonNullable<ReturnType<typeof csvSourceId>> => source !== null));
  const imported = new Set<string>();
  for (const row of records) { const source = csvSourceId(row.source), month = csvMonth(row.date); if (source && month) imported.add(source + ":" + month); }
  for (const row of logs) { const source = csvSourceId(row.source); if (source && validMonth(row.month)) imported.add(source + ":" + row.month); }
  const sources = csvImportSources.filter(source => active.size === 0 || active.has(source.id)).map(source => ({ ...source, missingMonths: months.filter(month => !imported.has(source.id + ":" + month)) }));
  return { currentMonth, months, sources, missingMonths: months.filter(month => sources.some(source => source.missingMonths.includes(month))), hasPriorImports: active.size > 0 };
}
export type CsvImportStatus = ReturnType<typeof buildCsvImportStatus>;
