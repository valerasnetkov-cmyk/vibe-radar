import { sql } from "drizzle-orm";
import { index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { projects, sourceEvents } from "@/server/db/schema";

export const mechanicStageEnum = pgEnum("mechanic_stage", [
  "SPARK",
  "RISING",
  "BREAKOUT",
  "ESTABLISHED",
]);
export const mechanicStatusEnum = pgEnum("mechanic_status", ["ACTIVE", "ARCHIVED"]);
export const mechanicReviewDecisionEnum = pgEnum("mechanic_review_decision", ["APPROVE", "REJECT"]);

export const productMechanics = pgTable("product_mechanics", {
  id: uuid("id").defaultRandom().primaryKey(),
  canonicalName: text("canonical_name").notNull().unique(),
  canonicalKey: text("canonical_key"),
  description: text("description").notNull(),
  firstObservedAt: timestamp("first_observed_at", { withTimezone: true }).notNull(),
  lastObservedAt: timestamp("last_observed_at", { withTimezone: true }).notNull(),
  stage: mechanicStageEnum("stage").notNull(),
  velocity: integer("velocity").notNull(),
  confidence: integer("confidence").notNull(),
  policyVersion: integer("policy_version").notNull().default(1),
  status: mechanicStatusEnum("status").notNull().default("ACTIVE"),
  affectedCategories: jsonb("affected_categories").$type<string[]>().notNull(),
  radarTracks: text("radar_tracks")
    .array()
    .$type<string[]>()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
  practicalImplications: jsonb("practical_implications").$type<string[]>().notNull(),
  risks: jsonb("risks").$type<string[]>().notNull(),
});

export const mechanicEvidence = pgTable(
  "mechanic_evidence",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    mechanicId: uuid("mechanic_id")
      .notNull()
      .references(() => productMechanics.id),
    signalId: text("signal_id"),
    projectId: uuid("project_id").references(() => projects.id),
    sourceEventId: uuid("source_event_id").references(() => sourceEvents.id),
    independenceGroup: text("independence_group").notNull(),
    independenceBasis: text("independence_basis"),
    evidenceKey: text("evidence_key"),
    observedAt: timestamp("observed_at", { withTimezone: true }),
    strength: integer("strength").notNull(),
  },
  (table) => [index("mechanic_evidence_mechanic_idx").on(table.mechanicId)],
);

export const mechanicReviews = pgTable(
  "mechanic_reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    mechanicId: uuid("mechanic_id")
      .notNull()
      .references(() => productMechanics.id),
    editorActorId: text("editor_actor_id").notNull(),
    decision: mechanicReviewDecisionEnum("decision").notNull(),
    note: text("note"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("mechanic_reviews_mechanic_time_idx").on(table.mechanicId, table.reviewedAt)],
);
