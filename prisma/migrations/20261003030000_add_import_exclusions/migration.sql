CREATE TABLE "ImportExclusion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImportExclusion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ImportExclusion_name_key" ON "ImportExclusion"("name");
