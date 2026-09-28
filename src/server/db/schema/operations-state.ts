import {
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const digestWindowEnum = pgEnum("digest_window", ["DAILY", "WEEKLY"]);

export const jobLeases = pgTable("job_leases", {
  jobName: text("job_name").primaryKey(),
  ownerId: text("owner_id").notNull(),
  lockedUntil: timestamp("locked_until", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const aiDailyUsage = pgTable("ai_daily_usage", {
  utcDay: date("utc_day").primaryKey(),
  usedCount: integer("used_count").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const radarDigests = pgTable(
  "radar_digests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    window: digestWindowEnum("window").notNull(),
    periodKey: text("period_key").notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
    contentPayload: jsonb("content_payload").$type<Record<string, unknown>>(),
    itemCount: integer("item_count").notNull().default(0),
  },
  (table) => [unique("uq_radar_digests_window_period").on(table.window, table.periodKey)],
);
