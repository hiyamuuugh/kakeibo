-- Keep all existing quantities; allow records without a known package size.
ALTER TABLE "PriceRecord" ALTER COLUMN "quantity" DROP NOT NULL;
