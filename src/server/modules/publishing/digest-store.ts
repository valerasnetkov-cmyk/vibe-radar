import { and, eq } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { radarDigests } from "@/server/db/schema";
import type { RadarDigest } from "@/server/modules/publishing/digest";

export type DigestWindow = "DAILY" | "WEEKLY";

/**
 * Deterministic UTC period keys: calendar day for DAILY, ISO week for
 * WEEKLY. Storage and schedule timestamps stay in UTC; no local timezone
 * leaks into digest identity.
 */
export function digestPeriodKey(window: DigestWindow, generatedAt: Date): string {
  const year = generatedAt.getUTCFullYear();
  if (window === "DAILY") {
    const month = String(generatedAt.getUTCMonth() + 1).padStart(2, "0");
    const day = String(generatedAt.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  const thursday = new Date(Date.UTC(year, generatedAt.getUTCMonth(), generatedAt.getUTCDate()));
  const weekday = (thursday.getUTCDay() + 6) % 7;
  thursday.setUTCDate(thursday.getUTCDate() - weekday + 3);
  const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
  const firstWeekday = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstWeekday + 3);
  const week = 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / 604800000);
  return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/**
 * Idempotent digest persistence: retries for the same window/period return
 * the existing row instead of duplicating history.
 */
export async function getOrCreateRadarDigest(
  database: ReturnType<typeof getDatabase>,
  window: DigestWindow,
  digest: RadarDigest,
): Promise<{ id: string; created: boolean }> {
  const periodKey = digestPeriodKey(window, digest.generatedAt);
  const [inserted] = await database
    .insert(radarDigests)
    .values({
      window,
      periodKey,
      generatedAt: digest.generatedAt,
      contentPayload: JSON.parse(JSON.stringify(digest)) as Record<string, unknown>,
      itemCount: digest.items.length,
    })
    .onConflictDoNothing()
    .returning({ id: radarDigests.id });
  if (inserted) return { id: inserted.id, created: true };
  const [existing] = await database
    .select({ id: radarDigests.id })
    .from(radarDigests)
    .where(and(eq(radarDigests.window, window), eq(radarDigests.periodKey, periodKey)))
    .limit(1);
  if (!existing) throw new Error("Radar digest could not be created or found");
  return { id: existing.id, created: false };
}
