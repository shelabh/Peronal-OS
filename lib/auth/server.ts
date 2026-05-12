import { createNeonAuth } from "@neondatabase/auth/next/server";
import { db } from "@/lib/db";

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

export const auth = createNeonAuth({
  baseUrl: getRequiredEnv("NEON_AUTH_BASE_URL"),
  cookies: {
    secret: getRequiredEnv("NEON_AUTH_COOKIE_SECRET"),
  },
});

export interface AuthenticatedAppUser {
  id: string;
  email: string | null | undefined;
  name: string | null | undefined;
}

export async function getCurrentSession() {
  const { data, error } = await auth.getSession();

  if (error) {
    console.error("Failed to read Neon auth session", error);
    return null;
  }

  return data;
}

export async function syncCurrentAppUser(): Promise<AuthenticatedAppUser | null> {
  const session = await getCurrentSession();

  if (!session?.user) {
    return null;
  }

  const user = {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  };

  await db.user.upsert({
    where: { id: user.id },
    update: {
      name: user.name || user.email || "User",
    },
    create: {
      id: user.id,
      name: user.name || user.email || "User",
    },
  });

  return user;
}

export async function getCurrentUserId(): Promise<string | null> {
  const user = await syncCurrentAppUser();
  return user?.id ?? null;
}

export async function requireCurrentUserId(): Promise<string> {
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  return userId;
}
