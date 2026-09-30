import { index, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { productMechanics } from "@/server/db/schema/mechanics";

export const trackWatchProfiles = pgTable("track_watch_profiles", {
  profileKey: text("profile_key").primaryKey(),
  initializedAt: timestamp("initialized_at", { withTimezone: true }).defaultNow().notNull(),
});

export const trackWatchStates = pgTable(
  "track_watch_states",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileKey: text("profile_key").notNull(),
    mechanicId: uuid("mechanic_id")
      .notNull()
      .references(() => productMechanics.id),
    lastStage: text("last_stage").notNull(),
    lastVelocity: integer("last_velocity").notNull(),
    lastConfidence: integer("last_confidence").notNull(),
    providerMessageId: text("provider_message_id"),
    sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("uq_track_watch_state_profile_mechanic").on(table.profileKey, table.mechanicId),
    index("track_watch_state_sent_idx").on(table.sentAt),
  ],
);
