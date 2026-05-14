-- CreateEnum
CREATE TYPE "MetricSignalRole" AS ENUM ('BEHAVIOR', 'STATE', 'OUTCOME', 'RISK');

-- AlterTable
ALTER TABLE "DailyLog"
ADD COLUMN     "stress" INTEGER,
ADD COLUMN     "cravings" INTEGER,
ADD COLUMN     "recovery" INTEGER,
ADD COLUMN     "socialQuality" INTEGER,
ADD COLUMN     "environmentQuality" INTEGER,
ADD COLUMN     "focusFriction" INTEGER;

-- AlterTable
ALTER TABLE "Metric"
ADD COLUMN     "goalId" TEXT,
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "signalRole" "MetricSignalRole" NOT NULL DEFAULT 'BEHAVIOR';

-- AddForeignKey
ALTER TABLE "Metric" ADD CONSTRAINT "Metric_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Metric" ADD CONSTRAINT "Metric_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
