CREATE TABLE IF NOT EXISTS "MonthlyBudgetPlan" (
    "scope" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MonthlyBudgetPlan_pkey" PRIMARY KEY ("scope")
);
