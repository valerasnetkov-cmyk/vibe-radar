import { getDatabase } from "@/server/db/client";
import { publicationEvents } from "@/server/db/schema/publication-analytics";

/**
 * Records only real provider-observed events. DELIVERED means the Telegram
 * provider accepted the message. VIEWED/CLICKED are never synthesized: no
 * scheduler, job, or test may invent engagement the provider did not report.
 */
export async function recordPublicationEvent(
  publicationId: string,
  eventType: "DELIVERED" | "VIEWED" | "CLICKED" | "FAILED",
  source: string,
  occurredAt = new Date(),
  database: ReturnType<typeof getDatabase> = getDatabase(),
) {
  return database
    .insert(publicationEvents)
    .values({ publicationId, eventType, source: source.slice(0, 80), occurredAt })
    .returning({ id: publicationEvents.id });
}
