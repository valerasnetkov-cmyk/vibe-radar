import { index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { buildabilityAssessments } from "@/server/db/schema";

// Local binding for the shared buildability_label Postgres type avoids a
// module cycle with the schema root; the type name and values are identical.
const buildabilityLabelEnum = pgEnum("buildability_label", [
  "SOLO_MVP",
  "SMALL_TEAM",
  "TEAM_REQUIRED",
]);

export const opportunityMarketScopeEnum = pgEnum("opportunity_market_scope", [
  "RU",
  "GLOBAL",
  "RU_GLOBAL",
]);
export const opportunityStatusEnum = pgEnum("opportunity_status", [
  "PROPOSED",
  "REVIEWED",
  "PUBLISHED",
  "REJECTED",
]);
export const opportunityReviewDecisionEnum = pgEnum("opportunity_review_decision", [
  "APPROVE",
  "REJECT",
]);

export const opportunities = pgTable(
  "opportunities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    problemStatement: text("problem_statement").notNull(),
    proposedProduct: text("proposed_product").notNull(),
    targetUser: text("target_user").notNull(),
    marketScope: opportunityMarketScopeEnum("market_scope").notNull(),
    buildabilityAssessmentId: uuid("buildability_assessment_id")
      .notNull()
      .references(() => buildabilityAssessments.id),
    buildabilityLabel: buildabilityLabelEnum("buildability_label"),
    requiredCapabilities: jsonb("required_capabilities").$type<string[]>(),
    differentiationHypothesis: text("differentiation_hypothesis").notNull(),
    riskSummary: jsonb("risk_summary").$type<string[]>().notNull(),
    opportunityConfidence: integer("opportunity_confidence").notNull(),
    canonicalKey: text("canonical_key"),
    policyVersion: integer("policy_version").notNull().default(1),
    status: opportunityStatusEnum("status").notNull().default("PROPOSED"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("opportunities_status_created_idx").on(table.status, table.createdAt)],
);

export const opportunityEvidence = pgTable(
  "opportunity_evidence",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    opportunityId: uuid("opportunity_id")
      .notNull()
      .references(() => opportunities.id),
    subjectType: text("subject_type").notNull(),
    subjectId: text("subject_id").notNull(),
    rationale: text("rationale").notNull(),
    evidenceWeight: integer("evidence_weight").notNull(),
    evidenceKey: text("evidence_key"),
  },
  (table) => [index("opportunity_evidence_opportunity_idx").on(table.opportunityId)],
);

export const opportunityReviews = pgTable(
  "opportunity_reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    opportunityId: uuid("opportunity_id")
      .notNull()
      .references(() => opportunities.id),
    editorActorId: text("editor_actor_id").notNull(),
    decision: opportunityReviewDecisionEnum("decision").notNull(),
    note: text("note"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("opportunity_reviews_opportunity_time_idx").on(table.opportunityId, table.reviewedAt),
  ],
);
