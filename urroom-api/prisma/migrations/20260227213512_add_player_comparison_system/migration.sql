-- CreateTable
CREATE TABLE "public"."ProPlayerProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currentClub" TEXT,
    "nationality" TEXT NOT NULL,
    "positions" TEXT[],
    "birthDate" TIMESTAMP(3) NOT NULL,
    "photoUrl" TEXT,
    "currentLeague" TEXT NOT NULL,
    "marketValue" DOUBLE PRECISION,
    "playingStyle" TEXT[],
    "careerPath" TEXT[],
    "historicalStats" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProPlayerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlayerComparison" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "proPlayerId" TEXT NOT NULL,
    "matchScore" DOUBLE PRECISION NOT NULL,
    "similarities" TEXT[],
    "differences" TEXT[],
    "technicalMatch" DOUBLE PRECISION NOT NULL,
    "physicalMatch" DOUBLE PRECISION NOT NULL,
    "styleMatch" DOUBLE PRECISION NOT NULL,
    "playerAge" INTEGER NOT NULL,
    "proPlayerAge" INTEGER NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerComparison_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProPlayerProfile_name_key" ON "public"."ProPlayerProfile"("name");

-- CreateIndex
CREATE INDEX "ProPlayerProfile_positions_idx" ON "public"."ProPlayerProfile"("positions");

-- CreateIndex
CREATE INDEX "ProPlayerProfile_currentLeague_idx" ON "public"."ProPlayerProfile"("currentLeague");

-- CreateIndex
CREATE INDEX "PlayerComparison_playerId_idx" ON "public"."PlayerComparison"("playerId");

-- CreateIndex
CREATE INDEX "PlayerComparison_matchScore_idx" ON "public"."PlayerComparison"("matchScore");

-- AddForeignKey
ALTER TABLE "public"."PlayerComparison" ADD CONSTRAINT "PlayerComparison_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "public"."PlayerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerComparison" ADD CONSTRAINT "PlayerComparison_proPlayerId_fkey" FOREIGN KEY ("proPlayerId") REFERENCES "public"."ProPlayerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
