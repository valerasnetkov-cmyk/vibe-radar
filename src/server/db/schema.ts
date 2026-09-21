import { sql } from "drizzle-orm";
export {
  publicationEvents,
  publicationEventTypeEnum,
} from "@/server/db/schema/publication-analytics";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const providerEnum = pgEnum("provider", ["github"]);
export const projectStatusEnum = pgEnum("project_status", ["active", "archived"]);
export const publicationStatusEnum = pgEnum("publication_status", [
  "pending",
  "published",
  "failed",
]);
export const confidenceLevelEnum = pgEnum("confidence_level", ["LOW", "MEDIUM", "HIGH"]);
export const buildabilityLabelEnum = pgEnum("buildability_label", [
  "SOLO_MVP",
  "SMALL_TEAM",
  "TEAM_REQUIRED",
]);
export const candidateStatusEnum = pgEnum("candidate_status", [
  "CANDIDATE",
  "ANALYSIS_PENDING",
  "REVIEW",
  "WATCHING",
  "REJECTED",
  "APPROVED",
  "EXPIRED",
]);
export const analysisStatusEnum = pgEnum("analysis_status", ["SUCCEEDED", "ANALYSIS_FAILED"]);
export const editorialDecisionEnum = pgEnum("editorial_decision", ["APPROVE", "WATCH", "REJECT"]);
export const jobRunStatusEnum = pgEnum("job_run_status", [
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
  "DEAD_LETTER",
]);
export const mechanicStageEnum = pgEnum("mechanic_stage", [
  "SPARK",
  "RISING",
  "BREAKOUT",
  "ESTABLISHED",
]);
export const mechanicStatusEnum = pgEnum("mechanic_status", ["ACTIVE", "ARCHIVED"]);
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

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),
    primaryCategory: text("primary_category"),
    status: projectStatusEnum("status").default("active").notNull(),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [
    index("projects_category_idx").on(table.primaryCategory),
    index("projects_last_seen_idx").on(table.lastSeenAt),
  ],
);

export const providerIdentities = pgTable(
  "provider_identities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    provider: providerEnum("provider").notNull(),
    providerObjectId: text("provider_object_id").notNull(),
    providerOwner: text("provider_owner").notNull(),
    providerName: text("provider_name").notNull(),
    providerFullName: text("provider_full_name").notNull(),
    providerUrl: text("provider_url").notNull(),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [unique("provider_identity_unique").on(table.provider, table.providerObjectId)],
);

export const sourceEvents = pgTable(
  "source_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provider: providerEnum("provider").notNull(),
    sourceKind: text("source_kind").notNull(),
    sourceKey: text("source_key").notNull(),
    retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull(),
    status: text("status").notNull(),
    payloadHash: text("payload_hash"),
    normalizedMetadata: jsonb("normalized_metadata").$type<Record<string, unknown>>(),
  },
  (table) => [unique("source_event_key_unique").on(table.provider, table.sourceKey)],
);

export const projectSnapshots = pgTable(
  "project_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    sourceEventId: uuid("source_event_id")
      .notNull()
      .references(() => sourceEvents.id),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
    stars: bigint("stars", { mode: "number" }).notNull(),
    forks: bigint("forks", { mode: "number" }).notNull(),
    openIssues: integer("open_issues").notNull(),
    watchers: bigint("watchers", { mode: "number" }),
  },
  (table) => [
    unique("snapshot_observation_unique").on(table.projectId, table.observedAt),
    index("snapshots_project_time_idx").on(table.projectId, table.observedAt),
  ],
);

export const releases = pgTable(
  "releases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    providerReleaseId: text("provider_release_id").notNull(),
    tagName: text("tag_name").notNull(),
    name: text("name"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    isPrerelease: boolean("is_prerelease").notNull(),
    isDraft: boolean("is_draft").notNull(),
    summary: text("summary"),
    sourceEventId: uuid("source_event_id")
      .notNull()
      .references(() => sourceEvents.id),
  },
  (table) => [unique("release_identity_unique").on(table.projectId, table.providerReleaseId)],
);

export const scores = pgTable(
  "scores",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    scoreVersion: integer("score_version").notNull(),
    calculatedAt: timestamp("calculated_at", { withTimezone: true }).notNull(),
    velocityScore: integer("velocity_score").notNull(),
    noveltyScore: integer("novelty_score").notNull(),
    crossSourceScore: integer("cross_source_score").notNull(),
    relevanceScore: integer("relevance_score").notNull(),
    projectHealthScore: integer("project_health_score").notNull(),
    penaltyScore: integer("penalty_score").notNull(),
    finalScore: integer("final_score").notNull(),
    breakdown: jsonb("breakdown").$type<Record<string, unknown>>().notNull(),
  },
  (table) => [index("scores_project_time_idx").on(table.projectId, table.calculatedAt)],
);

export const confidenceAssessments = pgTable(
  "confidence_assessments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    confidenceVersion: integer("confidence_version").notNull(),
    calculatedAt: timestamp("calculated_at", { withTimezone: true }).notNull(),
    value: integer("value").notNull(),
    level: confidenceLevelEnum("level").notNull(),
    evidenceCount: integer("evidence_count").notNull(),
    contradictionCount: integer("contradiction_count").notNull(),
    explanation: jsonb("explanation").$type<Record<string, unknown>>().notNull(),
  },
  (table) => [index("confidence_project_time_idx").on(table.projectId, table.calculatedAt)],
);

export const buildabilityAssessments = pgTable(
  "buildability_assessments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    assessmentVersion: integer("assessment_version").notNull(),
    calculatedAt: timestamp("calculated_at", { withTimezone: true }).notNull(),
    label: buildabilityLabelEnum("label").notNull(),
    dimensions: jsonb("dimensions").$type<Record<string, unknown>>().notNull(),
    constraints: jsonb("constraints").$type<string[]>().notNull(),
    explanation: text("explanation").notNull(),
  },
  (table) => [index("buildability_project_time_idx").on(table.projectId, table.calculatedAt)],
);

export const candidates = pgTable(
  "candidates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    scoreId: uuid("score_id")
      .notNull()
      .references(() => scores.id),
    reason: text("reason").notNull(),
    status: candidateStatusEnum("status").notNull().default("CANDIDATE"),
    dedupeKey: text("dedupe_key").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (table) => [index("candidates_project_status_idx").on(table.projectId, table.status)],
);

export const analyses = pgTable(
  "analyses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidates.id),
    analysisVersion: integer("analysis_version").notNull(),
    promptVersion: text("prompt_version").notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    output: jsonb("output").$type<Record<string, unknown>>(),
    status: analysisStatusEnum("status").notNull(),
    attempts: integer("attempts").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("analyses_candidate_time_idx").on(table.candidateId, table.createdAt)],
);

export const editorialDecisions = pgTable(
  "editorial_decisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidates.id),
    editorActorId: text("editor_actor_id").notNull(),
    decision: editorialDecisionEnum("decision").notNull(),
    note: text("note"),
    decidedAt: timestamp("decided_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("editorial_decisions_candidate_time_idx").on(table.candidateId, table.decidedAt),
  ],
);

export const publications = pgTable(
  "publications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    candidateId: uuid("candidate_id").notNull(),
    editorialDecisionId: uuid("editorial_decision_id").notNull(),
    channel: text("channel").notNull(),
    contentVersion: text("content_version").notNull(),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    status: publicationStatusEnum("status").default("pending").notNull(),
    providerMessageId: text("provider_message_id"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [index("publications_candidate_idx").on(table.candidateId)],
);

export const jobRuns = pgTable(
  "job_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jobName: text("job_name").notNull(),
    status: jobRunStatusEnum("status").notNull(),
    attemptCount: integer("attempt_count").notNull(),
    maxAttempts: integer("max_attempts").notNull(),
    errorCode: text("error_code"),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (table) => [index("job_runs_name_started_idx").on(table.jobName, table.startedAt)],
);

export const productMechanics = pgTable("product_mechanics", {
  id: uuid("id").defaultRandom().primaryKey(),
  canonicalName: text("canonical_name").notNull().unique(),
  description: text("description").notNull(),
  firstObservedAt: timestamp("first_observed_at", { withTimezone: true }).notNull(),
  lastObservedAt: timestamp("last_observed_at", { withTimezone: true }).notNull(),
  stage: mechanicStageEnum("stage").notNull(),
  velocity: integer("velocity").notNull(),
  confidence: integer("confidence").notNull(),
  status: mechanicStatusEnum("status").notNull().default("ACTIVE"),
  affectedCategories: jsonb("affected_categories").$type<string[]>().notNull(),
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
    strength: integer("strength").notNull(),
  },
  (table) => [index("mechanic_evidence_mechanic_idx").on(table.mechanicId)],
);

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
    differentiationHypothesis: text("differentiation_hypothesis").notNull(),
    riskSummary: jsonb("risk_summary").$type<string[]>().notNull(),
    opportunityConfidence: integer("opportunity_confidence").notNull(),
    status: opportunityStatusEnum("status").notNull().default("PROPOSED"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
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
  },
  (table) => [index("opportunity_evidence_opportunity_idx").on(table.opportunityId)],
);

export const isEmptyJson = sql`'{}'::jsonb`;
