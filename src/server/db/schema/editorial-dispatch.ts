import { integer, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

export const dispatchStatusEnum = pgEnum("dispatch_status", ["PENDING", "SENT", "FAILED"]);

export const editorialReviewDispatches = pgTable(
  "editorial_review_dispatches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    candidateId: uuid("candidate_id").notNull(),
    status: dispatchStatusEnum("status").notNull().default("PENDING"),
    providerMessageId: text("provider_message_id"),
    attemptCount: integer("attempt_count").notNull().default(0),
    lastErrorCode: text("last_error_code"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
  },
  (table) => [unique("editorial_review_dispatches_candidate_id_unique").on(table.candidateId)],
);
