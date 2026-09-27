import { and, eq } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { candidates, editorialReviewDispatches } from "@/server/db/schema";
import type { EditorCard } from "@/server/modules/telegram/editor-card";
import type { EditorBot } from "@/server/modules/telegram/editor-bot";

const MAX_DISPATCH_ATTEMPTS = 3;

/**
 * Normalize provider failures to safe codes without leaking secrets or
 * raw exception text. Never returns token-bearing content.
 */
export function normalizeTelegramError(error: unknown): string {
  if (error !== null && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string" && /^[A-Z][A-Z0-9_]{1,64}$/.test(code)) return code;
  }
  if (error instanceof DOMException && error.name === "AbortError") return "TIMEOUT";
  if (error instanceof Error && error.name === "AbortError") return "TIMEOUT";
  if (error instanceof TypeError) return "NETWORK_ERROR";
  return "PROVIDER_ERROR";
}

export type DispatchOutcome =
  | { outcome: "sent"; providerMessageId: string }
  | { outcome: "already_sent" }
  | { outcome: "busy" }
  | { outcome: "failed"; errorCode: string }
  | { outcome: "exhausted" }
  | { outcome: "finalization_failed"; providerMessageId: string };

/**
 * DB-backed idempotent dispatch claim.
 *
 * - INSERT PENDING ON CONFLICT(candidate_id) DO NOTHING; only the claim
 *   owner may call Telegram.
 * - SENT dispatches never send again (already_sent).
 * - A PENDING row owned by another worker is not sent concurrently (busy).
 * - FAILED rows are retried only through an atomic conditional re-claim
 *   (UPDATE ... WHERE status='FAILED' AND attempt_count=? RETURNING);
 *   only the worker receiving the row owns the retry.
 * - Provider send errors and post-delivery DB finalization errors are
 *   strictly separated: a DB failure after confirmed Telegram delivery is
 *   never classified as a provider error and never resends automatically.
 *   The row keeps a reconciliation marker (`FINALIZATION_FAILED`) and stays
 *   non-retriable until reconciled.
 * - Provider timeout ambiguity is documented: exactly-once delivery across
 *   the external Telegram boundary is not claimed.
 */
export async function dispatchCandidateForReviewService(
  database: ReturnType<typeof getDatabase>,
  candidateId: string,
  card: EditorCard,
  bot: Pick<EditorBot, "sendReviewCard">,
): Promise<DispatchOutcome> {
  const [freshClaim] = await database
    .insert(editorialReviewDispatches)
    .values({ candidateId, status: "PENDING", attemptCount: 0 })
    .onConflictDoNothing({ target: editorialReviewDispatches.candidateId })
    .returning();

  let dispatchRecord = freshClaim ?? null;
  if (!dispatchRecord) {
    const [existing] = await database
      .select()
      .from(editorialReviewDispatches)
      .where(eq(editorialReviewDispatches.candidateId, candidateId))
      .limit(1);
    dispatchRecord = existing ?? null;
  }
  if (!dispatchRecord) return { outcome: "busy" };
  if (dispatchRecord.status === "SENT") return { outcome: "already_sent" };

  let attempts = dispatchRecord.attemptCount ?? 0;
  let ownsClaim = freshClaim !== null && freshClaim !== undefined;

  if (dispatchRecord.status === "FAILED") {
    if (attempts >= MAX_DISPATCH_ATTEMPTS) return { outcome: "exhausted" };
    // Atomic retry claim: concurrent workers race this UPDATE, but only
    // the worker receiving the row from RETURNING owns the retry.
    const [claimed] = await database
      .update(editorialReviewDispatches)
      .set({ status: "PENDING", updatedAt: new Date() })
      .where(
        and(
          eq(editorialReviewDispatches.candidateId, candidateId),
          eq(editorialReviewDispatches.status, "FAILED"),
          eq(editorialReviewDispatches.attemptCount, attempts),
        ),
      )
      .returning();
    if (!claimed) return { outcome: "busy" };
    dispatchRecord = claimed;
    attempts = claimed.attemptCount ?? attempts;
    ownsClaim = true;
  }

  if (!ownsClaim) return { outcome: "busy" };

  // Provider boundary: ONLY send errors reach the catch below. Anything
  // thrown by bot.sendReviewCard means delivery did not confirm.
  let providerMessageId: string;
  try {
    const providerResult = await bot.sendReviewCard(card);
    providerMessageId = providerResult.providerMessageId;
  } catch (error) {
    const errorCode = normalizeTelegramError(error);
    await database
      .update(editorialReviewDispatches)
      .set({
        status: "FAILED",
        lastErrorCode: errorCode,
        attemptCount: attempts + 1,
        updatedAt: new Date(),
      })
      .where(eq(editorialReviewDispatches.candidateId, candidateId));
    return { outcome: "failed", errorCode };
  }

  // DB finalization AFTER confirmed provider delivery, in one transaction.
  // A failure here must NOT be classified as a provider error and must NOT
  // trigger an automatic resend: the provider side effect may already exist.
  try {
    await database.transaction(async (tx) => {
      await tx
        .update(editorialReviewDispatches)
        .set({
          status: "SENT",
          providerMessageId,
          attemptCount: attempts + 1,
          updatedAt: new Date(),
          sentAt: new Date(),
        })
        .where(eq(editorialReviewDispatches.candidateId, candidateId));
      await tx.update(candidates).set({ status: "REVIEW" }).where(eq(candidates.id, candidateId));
    });
    return { outcome: "sent", providerMessageId };
  } catch {
    // Best-effort reconciliation marker; never masks the outcome and never
    // changes the row to FAILED (which would wrongly re-arm retry).
    try {
      await database
        .update(editorialReviewDispatches)
        .set({ lastErrorCode: "FINALIZATION_FAILED", updatedAt: new Date() })
        .where(eq(editorialReviewDispatches.candidateId, candidateId));
    } catch {
      // Database is known-unhealthy here; the outcome carries the signal.
    }
    return { outcome: "finalization_failed", providerMessageId };
  }
}
