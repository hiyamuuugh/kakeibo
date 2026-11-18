CREATE TABLE IF NOT EXISTS "CsvImportMonth" (
  "id" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "memberScope" TEXT NOT NULL,
  "month" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CsvImportMonth_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CsvImportMonth_source_memberScope_month_key" ON "CsvImportMonth"("source", "memberScope", "month");
