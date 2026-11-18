CREATE TABLE IF NOT EXISTS "CsvReminderAcknowledgement" (
  "memberScope" TEXT NOT NULL,
  "month" TEXT NOT NULL,
  "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CsvReminderAcknowledgement_pkey" PRIMARY KEY ("memberScope", "month")
);
