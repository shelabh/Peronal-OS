import { db } from "@/lib/db";
import { getTodayDate } from "@/lib/utils";

export interface DailyCheckIn {
  date: string;
  sleepHours: number | null;
  mood: number | null;
  energy: number | null;
  weight: number | null;
  steps: number | null;
  healthNotes: string | null;
  reflection: string | null;
  dailyScore: number | null;
  stress: number | null;
  cravings: number | null;
  recovery: number | null;
  socialQuality: number | null;
  environmentQuality: number | null;
  focusFriction: number | null;
  hasData: boolean;
}

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

export async function getDailyCheckIn(userId: string, date: Date = getTodayDate()): Promise<DailyCheckIn> {
  const day = startOfDay(date);
  const [healthEntry, dailyLog] = await Promise.all([
    db.healthEntry.findUnique({
      where: { userId_date: { userId, date: day } },
    }),
    db.dailyLog.findUnique({
      where: { userId_date: { userId, date: day } },
    }),
  ]);

  return {
    date: day.toISOString(),
    sleepHours: healthEntry?.sleepHours ?? null,
    mood: healthEntry?.mood ?? null,
    energy: healthEntry?.energy ?? null,
    weight: healthEntry?.weight ?? null,
    steps: healthEntry?.steps ?? null,
    healthNotes: healthEntry?.notes ?? null,
    reflection: dailyLog?.reflection ?? null,
    dailyScore: dailyLog?.dailyScore ?? null,
    stress: dailyLog?.stress ?? null,
    cravings: dailyLog?.cravings ?? null,
    recovery: dailyLog?.recovery ?? null,
    socialQuality: dailyLog?.socialQuality ?? null,
    environmentQuality: dailyLog?.environmentQuality ?? null,
    focusFriction: dailyLog?.focusFriction ?? null,
    hasData: Boolean(healthEntry || dailyLog),
  };
}

export async function getRecentDailyCheckIns(userId: string, days = 7): Promise<DailyCheckIn[]> {
  const endDate = getTodayDate();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - (days - 1));
  const rangeEnd = new Date(endDate);
  rangeEnd.setDate(rangeEnd.getDate() + 1);

  const [healthEntries, dailyLogs] = await Promise.all([
    db.healthEntry.findMany({
      where: { userId, date: { gte: startDate, lt: rangeEnd } },
      orderBy: { date: "asc" },
    }),
    db.dailyLog.findMany({
      where: { userId, date: { gte: startDate, lt: rangeEnd } },
      orderBy: { date: "asc" },
    }),
  ]);

  const healthByDay = new Map(
    healthEntries.map((entry) => [startOfDay(entry.date).toISOString(), entry])
  );
  const logByDay = new Map(
    dailyLogs.map((entry) => [startOfDay(entry.date).toISOString(), entry])
  );

  const results: DailyCheckIn[] = [];
  for (let index = 0; index < days; index += 1) {
    const day = new Date(startDate);
    day.setDate(startDate.getDate() + index);
    const key = startOfDay(day).toISOString();
    const healthEntry = healthByDay.get(key);
    const dailyLog = logByDay.get(key);

    results.push({
      date: key,
      sleepHours: healthEntry?.sleepHours ?? null,
      mood: healthEntry?.mood ?? null,
      energy: healthEntry?.energy ?? null,
      weight: healthEntry?.weight ?? null,
      steps: healthEntry?.steps ?? null,
      healthNotes: healthEntry?.notes ?? null,
      reflection: dailyLog?.reflection ?? null,
      dailyScore: dailyLog?.dailyScore ?? null,
      stress: dailyLog?.stress ?? null,
      cravings: dailyLog?.cravings ?? null,
      recovery: dailyLog?.recovery ?? null,
      socialQuality: dailyLog?.socialQuality ?? null,
      environmentQuality: dailyLog?.environmentQuality ?? null,
      focusFriction: dailyLog?.focusFriction ?? null,
      hasData: Boolean(healthEntry || dailyLog),
    });
  }

  return results;
}
