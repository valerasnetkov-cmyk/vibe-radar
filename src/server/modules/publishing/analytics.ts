import { getDatabase } from "@/server/db/client";
import { publicationEvents } from "@/server/db/schema/publication-analytics";

export async function recordPublicationEvent(
  publicationId: string,
  eventType: "DELIVERED" | "VIEWED" | "CLICKED" | "FAILED",
  source: string,
  occurredAt = new Date(),
) {
  return getDatabase()
    .insert(publicationEvents)
    .values({ publicationId, eventType, source: source.slice(0, 80), occurredAt })
    .returning({ id: publicationEvents.id });
}
