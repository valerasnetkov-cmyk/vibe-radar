import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { publications } from "@/server/db/schema";
import { loadEnvironment, requireTelegramPublishingConfig } from "@/server/config/env";
import {
  buildContentModelForApprovedCandidate,
  type ContentBuildFailureReason,
} from "@/server/modules/content/builder";
import { contentModelSchema, type ContentModel } from "@/server/modules/content/model";
import { recordPublicationEvent } from "@/server/modules/publishing/analytics";
import { renderTelegramHtml } from "@/server/modules/telegram/renderer";
import { TelegramPublisher, TelegramPublishError } from "@/server/modules/telegram/publisher";

const MAX_PUBLISH_ATTEMPTS = 3;

export type PublicationAdapter = {
  publish(chatId: string, html: string): Promise<{ providerMessageId: string }>;
};

export type PublishOutcome =
  | { outcome: "published"; providerMessageId: string }
  | { outcome: "already_published" }
  | { outcome: "busy" }
  | { outcome: "failed"; errorCode: string }
  | { outcome: "exhausted" }
  | { outcome: "finalization_failed"; providerMessageId: string }
  | { outcome: "rejected"; reason: ContentBuildFailureReason | "invalid_snapshot" };

export type PublishDependencies = {
  database?: ReturnType<typeof getDatabase>;
  /**
   * Test seam only. Production always resolves the channel from trusted
   * runtime config. Callers can never supply public content, HTML, or the
   * approval decision: those are derived from PostgreSQL inside the service.
   */
  channel?: string;
  publisher?: PublicationAdapter;
};

export function publicationIdempotencyKey(content: ContentModel, channel: string): string {
  return createHash("sha256")
    .update(`${content.candidateId}:${channel}:${content.contentVersion}`)
    .digest("hex");
}

/**
 * Canonical Stage 08 publication boundary. Accepts identity only.
 *
 * candidateId -> verify APPROVED + latest APPROVE decision -> build and
 * validate ContentModel from persisted records -> persist the immutable
 * content snapshot -> claim the idempotent publication row -> render ->
 * publish to the configured public channel.
 *
 * Concurrency: INSERT ... ON CONFLICT DO NOTHING elects one owner;
 * `published` never resends; foreign `pending` rows are `busy`; `failed`
 * rows retry only through an atomic conditional re-claim. Provider send
 * and DB finalization are strictly separated: post-delivery finalization
 * failure yields `finalization_failed` with the providerMessageId and
 * never resends automatically.
 */
export async function publishApprovedCandidate(
  candidateId: string,
  dependencies: PublishDependencies = {},
): Promise<PublishOutcome> {
  const database = dependencies.database ?? getDatabase();

  const built = await buildContentModelForApprovedCandidate(database, candidateId);
  if (!built.ok) return { outcome: "rejected", reason: built.reason };
  const model = built.model;

  let channel = dependencies.channel;
  let publisher = dependencies.publisher;
  if (!channel || !publisher) {
    const publishing = requireTelegramPublishingConfig(loadEnvironment());
    channel ??= publishing.channelId;
    publisher ??= new TelegramPublisher({
      token: publishing.botToken,
      timeoutMs: publishing.timeoutMs,
    });
  }

  const key = publicationIdempotencyKey(model, channel);
  const [freshClaim] = await database
    .insert(publications)
    .values({
      candidateId,
      editorialDecisionId: built.approvalDecisionId,
      channel,
      contentVersion: model.contentVersion,
      idempotencyKey: key,
      status: "pending",
      contentPayload: model,
      attemptCount: 0,
    })
    .onConflictDoNothing({ target: publications.idempotencyKey })
    .returning();

  let record = freshClaim ?? null;
  if (!record) {
    const [existing] = await database
      .select()
      .from(publications)
      .where(eq(publications.idempotencyKey, key))
      .limit(1);
    record = existing ?? null;
  }
  if (!record) return { outcome: "busy" };
  if (record.status === "published") return { outcome: "already_published" };

  let attempts = record.attemptCount ?? 0;
  let ownsClaim = freshClaim !== null && freshClaim !== undefined;
  let activeModel = model;

  if (record.status === "failed") {
    if (attempts >= MAX_PUBLISH_ATTEMPTS) return { outcome: "exhausted" };
    // Atomic retry claim: only the worker receiving the row owns the retry,
    // and the retry republishes the persisted immutable snapshot.
    const [claimed] = await database
      .update(publications)
      .set({ status: "pending", updatedAt: new Date() })
      .where(
        and(
          eq(publications.id, record.id),
          eq(publications.status, "failed"),
          eq(publications.attemptCount, attempts),
        ),
      )
      .returning();
    if (!claimed) return { outcome: "busy" };
    const stored = contentModelSchema.safeParse(claimed.contentPayload);
    if (!stored.success) return { outcome: "rejected", reason: "invalid_snapshot" };
    record = claimed;
    attempts = claimed.attemptCount ?? attempts;
    activeModel = stored.data;
    ownsClaim = true;
  }

  if (!ownsClaim) return { outcome: "busy" };
  const publicationId = record.id;

  // Provider boundary: ONLY send errors reach the catch below.
  const html = renderTelegramHtml(activeModel);
  let providerMessageId: string;
  try {
    const result = await publisher.publish(channel, html);
    providerMessageId = result.providerMessageId;
  } catch (error) {
    const errorCode = error instanceof TelegramPublishError ? error.code : "PUBLISH_PROVIDER_ERROR";
    await database
      .update(publications)
      .set({
        status: "failed",
        lastErrorCode: errorCode,
        attemptCount: attempts + 1,
        updatedAt: new Date(),
      })
      .where(eq(publications.id, publicationId));
    return { outcome: "failed", errorCode };
  }

  // DB finalization AFTER confirmed provider delivery. A failure here must
  // NOT become an ordinary provider failure and must NOT resend: the
  // provider side effect may already exist.
  try {
    await database.transaction(async (tx) => {
      await tx
        .update(publications)
        .set({
          status: "published",
          providerMessageId,
          attemptCount: attempts + 1,
          publishedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(publications.id, publicationId));
    });
    // Real provider-accepted event only; analytics failures never fail the
    // publication itself. VIEWED/CLICKED are never synthesized here.
    try {
      await recordPublicationEvent(publicationId, "DELIVERED", "telegram", new Date(), database);
    } catch {
      // Best effort only.
    }
    return { outcome: "published", providerMessageId };
  } catch {
    try {
      await database
        .update(publications)
        .set({ lastErrorCode: "FINALIZATION_FAILED", updatedAt: new Date() })
        .where(eq(publications.id, publicationId));
    } catch {
      // Database is known-unhealthy here; the outcome carries the signal.
    }
    return { outcome: "finalization_failed", providerMessageId };
  }
}
