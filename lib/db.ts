import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

// Default single-user ID for MVP (no auth)
export const DEFAULT_USER_ID = "default-user";

export async function ensureDefaultUser() {
  try {
    await db.user.upsert({
      where: { id: DEFAULT_USER_ID },
      update: {},
      create: { id: DEFAULT_USER_ID, name: "You" },
    });
  } catch {
    // Race condition: another concurrent request already created the user — safe to ignore
  }
}
