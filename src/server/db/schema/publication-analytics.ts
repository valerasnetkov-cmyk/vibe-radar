import { index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const publicationEventTypeEnum = pgEnum("publication_event_type", [
  "DELIVERED",
  "VIEWED",
  "CLICKED",
  "FAILED",
]);

export const publicationEvents = pgTable(
  "publication_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicationId: uuid("publication_id").notNull(),
    eventType: publicationEventTypeEnum("event_type").notNull(),
    source: text("source").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("publication_events_publication_time_idx").on(table.publicationId, table.occurredAt),
  ],
);
