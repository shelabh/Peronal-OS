CREATE TYPE "ExperimentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ABANDONED');

CREATE TABLE "Experiment" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "hypothesis" TEXT NOT NULL,
    "status" "ExperimentStatus" NOT NULL DEFAULT 'ACTIVE',
    "relatedPatternKey" TEXT,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "reviewDate" DATE,
    "actions" JSONB NOT NULL,
    "successCriteria" JSONB,
    "outcomeSummary" TEXT,
    "effectivenessScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "targetMetricId" TEXT,

    CONSTRAINT "Experiment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Experiment_userId_status_idx" ON "Experiment"("userId", "status");

ALTER TABLE "Experiment"
ADD CONSTRAINT "Experiment_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Experiment"
ADD CONSTRAINT "Experiment_targetMetricId_fkey"
FOREIGN KEY ("targetMetricId") REFERENCES "Metric"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
