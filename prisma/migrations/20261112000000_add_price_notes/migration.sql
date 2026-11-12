-- Additive and idempotent so this can also bootstrap existing deployments.
CREATE TABLE IF NOT EXISTS "PriceProduct" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "unit" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PriceProduct_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PriceProduct_name_category_unit_key" ON "PriceProduct"("name", "category", "unit");
CREATE TABLE IF NOT EXISTS "PriceRecord" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL REFERENCES "PriceProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "store" TEXT NOT NULL,
  "price" INTEGER NOT NULL CHECK ("price" > 0),
  "shipping" INTEGER NOT NULL DEFAULT 0 CHECK ("shipping" >= 0),
  "quantity" DOUBLE PRECISION NOT NULL CHECK ("quantity" > 0),
  "online" BOOLEAN NOT NULL DEFAULT false,
  "date" DATE NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PriceRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PriceRecord_productId_date_idx" ON "PriceRecord"("productId", "date");
