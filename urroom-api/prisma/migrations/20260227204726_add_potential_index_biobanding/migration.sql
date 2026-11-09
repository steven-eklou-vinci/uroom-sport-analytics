-- CreateEnum
CREATE TYPE "public"."Trajectory" AS ENUM ('RISING', 'STABLE_HIGH', 'STABLE_MID', 'DECLINING', 'INSUFFICIENT');

-- CreateEnum
CREATE TYPE "public"."MaturityLevel" AS ENUM ('EARLY_MATURE', 'AVERAGE', 'LATE_MATURE');

-- CreateTable
CREATE TABLE "public"."PotentialIndex" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "trajectory" "public"."Trajectory" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "factors" JSONB NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PotentialIndex_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BioBanding" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "chronologicalAge" DOUBLE PRECISION NOT NULL,
    "biologicalAge" DOUBLE PRECISION NOT NULL,
    "maturityOffset" DOUBLE PRECISION NOT NULL,
    "category" "public"."MaturityLevel" NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BioBanding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PotentialIndex_playerId_key" ON "public"."PotentialIndex"("playerId");

-- CreateIndex
CREATE INDEX "PotentialIndex_playerId_idx" ON "public"."PotentialIndex"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "BioBanding_playerId_key" ON "public"."BioBanding"("playerId");

-- CreateIndex
CREATE INDEX "BioBanding_playerId_idx" ON "public"."BioBanding"("playerId");

-- AddForeignKey
ALTER TABLE "public"."PotentialIndex" ADD CONSTRAINT "PotentialIndex_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "public"."PlayerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BioBanding" ADD CONSTRAINT "BioBanding_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "public"."PlayerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
