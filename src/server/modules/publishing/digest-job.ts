import { getDatabase } from "@/server/db/client";
import { generateRadarDigest } from "@/server/modules/publishing/digest";
import { getOrCreateRadarDigest } from "@/server/modules/publishing/digest-store";
import { getPublishedRadar } from "@/server/modules/publishing/read-model";

const DIGEST_LOOKBACK_LIMIT = 500;

/**
 * Durable digest jobs over persisted published content only. Unpublished
 * candidates can never enter a digest. Generation is idempotent per
 * window/period; digests are history records, not Telegram publications.
 */
export async function runConfiguredDailyRadar(
  now = new Date(),
  database: ReturnType<typeof getDatabase> = getDatabase(),
): Promise<void> {
  const entries = await getPublishedRadar(database, DIGEST_LOOKBACK_LIMIT);
  const since = now.getTime() - 24 * 60 * 60 * 1000;
  const digest = generateRadarDigest(
    entries.filter((entry) => entry.publishedAt.getTime() >= since),
    "DAILY",
    now,
  );
  await getOrCreateRadarDigest(database, "DAILY", digest);
}

export async function runConfiguredWeeklyRadar(
  now = new Date(),
  database: ReturnType<typeof getDatabase> = getDatabase(),
): Promise<void> {
  const entries = await getPublishedRadar(database, DIGEST_LOOKBACK_LIMIT);
  const since = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const digest = generateRadarDigest(
    entries.filter((entry) => entry.publishedAt.getTime() >= since),
    "WEEKLY",
    now,
  );
  await getOrCreateRadarDigest(database, "WEEKLY", digest);
}
