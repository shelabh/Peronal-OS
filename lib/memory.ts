import { db } from "@/lib/db";
import { requireCurrentUserId } from "@/lib/auth/server";
import type { WeeklyAnalysisResponse } from "@/lib/ai";

export type MemoryType = "INSIGHT" | "PREFERENCE" | "STRATEGY";

export interface MemoryRecord {
  id: string;
  type: MemoryType;
  content: string;
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

export interface SaveMemoryInput {
  type: MemoryType;
  content: string;
  confidence?: number;
  userId?: string;
}

function normalizeMemoryContent(content: string) {
  return content
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getWordOverlapScore(left: string, right: string) {
  const leftWords = new Set(normalizeMemoryContent(left).split(" ").filter(Boolean));
  const rightWords = new Set(normalizeMemoryContent(right).split(" ").filter(Boolean));

  if (leftWords.size === 0 || rightWords.size === 0) return 0;

  const intersection = [...leftWords].filter((word) => rightWords.has(word)).length;
  const union = new Set([...leftWords, ...rightWords]).size;

  return union === 0 ? 0 : intersection / union;
}

function areMemoriesSimilar(left: string, right: string) {
  const normalizedLeft = normalizeMemoryContent(left);
  const normalizedRight = normalizeMemoryContent(right);

  if (!normalizedLeft || !normalizedRight) return false;
  if (normalizedLeft === normalizedRight) return true;
  if (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft)) {
    return true;
  }

  return getWordOverlapScore(normalizedLeft, normalizedRight) >= 0.72;
}

async function getRecentMemoryRecords(userId: string, limit: number): Promise<MemoryRecord[]> {
  const rows = await db.$queryRaw<MemoryRecord[]>`
    SELECT
      "id",
      "type",
      "content",
      "confidence",
      "createdAt",
      "updatedAt",
      "userId"
    FROM "Memory"
    WHERE "userId" = ${userId}
    ORDER BY "updatedAt" DESC
    LIMIT ${limit}
  `;

  return rows;
}

export async function saveMemory(memory: SaveMemoryInput): Promise<void> {
  const userId = memory.userId ?? await requireCurrentUserId();
  const content = memory.content.trim();

  if (!content) return;

  const confidence = memory.confidence ?? 0.7;
  const recentMemories = await getRecentMemoryRecords(userId, 50);
  const existing = recentMemories.find(
    (entry) => entry.type === memory.type && areMemoriesSimilar(entry.content, content)
  );

  if (existing) {
    await db.$executeRaw`
      UPDATE "Memory"
      SET
        "content" = ${content.length > existing.content.length ? content : existing.content},
        "confidence" = ${Math.min(1, Math.max(existing.confidence, confidence) + 0.1)},
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${existing.id}
    `;

    return;
  }

  await db.$executeRaw`
    INSERT INTO "Memory" ("id", "type", "content", "confidence", "createdAt", "updatedAt", "userId")
    VALUES (
      ${crypto.randomUUID()},
      CAST(${memory.type} AS "MemoryType"),
      ${content},
      ${confidence},
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP,
      ${userId}
    )
  `;
}

export async function getRelevantMemory(userId?: string): Promise<string[]> {
  const resolvedUserId = userId ?? await requireCurrentUserId();
  const rows = await getRecentMemoryRecords(resolvedUserId, 20);

  return rows
    .sort((left, right) => {
      if (right.confidence !== left.confidence) {
        return right.confidence - left.confidence;
      }

      return right.updatedAt.getTime() - left.updatedAt.getTime();
    })
    .map((memory) => `[${memory.type.toLowerCase()}] ${memory.content}`);
}

export function extractMemoriesFromAnalysis(analysis: WeeklyAnalysisResponse): SaveMemoryInput[] {
  const candidates: SaveMemoryInput[] = [
    ...analysis.insights.map((content) => ({
      type: "INSIGHT" as const,
      content,
      confidence: 0.72,
    })),
    ...analysis.recommendations.map((content) => ({
      type: "STRATEGY" as const,
      content,
      confidence: 0.75,
    })),
  ];

  const deduped: SaveMemoryInput[] = [];

  for (const candidate of candidates) {
    if (!candidate.content.trim()) continue;

    const hasDuplicate = deduped.some(
      (entry) =>
        entry.type === candidate.type && areMemoriesSimilar(entry.content, candidate.content)
    );

    if (!hasDuplicate) {
      deduped.push(candidate);
    }
  }

  return deduped;
}

export async function storeAnalysisMemories(
  analysis: WeeklyAnalysisResponse,
  userId?: string
): Promise<void> {
  const resolvedUserId = userId ?? await requireCurrentUserId();
  const memories = extractMemoriesFromAnalysis(analysis);

  for (const memory of memories) {
    await saveMemory({ ...memory, userId: resolvedUserId });
  }
}
