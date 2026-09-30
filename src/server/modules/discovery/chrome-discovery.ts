import { createHash } from "node:crypto";
import { getDatabase } from "@/server/db/client";
import { sourceEvents } from "@/server/db/schema";
import { ChromeFeedClient, type ChromeFeedEntry } from "@/server/modules/chrome/feed";

function sourceHash(entry: ChromeFeedEntry): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        title: entry.title,
        url: entry.url,
        publishedAt: entry.publishedAt.toISOString(),
        summary: entry.summary,
      }),
    )
    .digest("hex");
}

export async function discoverChromeFeed(options: {
  timeoutMs: number;
  client?: ChromeFeedClient;
  now?: Date;
}): Promise<{ discovered: number; sourceEventIds: string[] }> {
  const database = getDatabase();
  const client = options.client ?? new ChromeFeedClient({ timeoutMs: options.timeoutMs });
  const entries = await client.listEntries();
  const retrievedAt = options.now ?? new Date();

  return database.transaction(async (transaction) => {
    const sourceEventIds: string[] = [];
    for (const entry of entries) {
      const [event] = await transaction
        .insert(sourceEvents)
        .values({
          provider: "chrome",
          sourceKind: "official_blog_post",
          sourceKey: entry.url,
          retrievedAt,
          status: "success",
          payloadHash: sourceHash(entry),
          normalizedMetadata: {
            title: entry.title,
            url: entry.url,
            publishedAt: entry.publishedAt.toISOString(),
            summary: entry.summary,
          },
        })
        .onConflictDoUpdate({
          target: [sourceEvents.provider, sourceEvents.sourceKey],
          set: {
            retrievedAt,
            status: "success",
            payloadHash: sourceHash(entry),
            normalizedMetadata: {
              title: entry.title,
              url: entry.url,
              publishedAt: entry.publishedAt.toISOString(),
              summary: entry.summary,
            },
          },
        })
        .returning({ id: sourceEvents.id });
      if (event?.id) sourceEventIds.push(event.id);
    }
    return { discovered: entries.length, sourceEventIds };
  });
}
