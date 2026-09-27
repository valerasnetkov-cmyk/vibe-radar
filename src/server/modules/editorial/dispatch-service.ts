import { eq } from "drizzle-orm";
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
  | { outcome: "exhausted" };

/**
 * DB-backed idempotent dispatch claim.
 *
 * - INSERT PENDING ON CONFLICT(candidate_id) DO NOTHING; only the claim
 *   owner may call Telegram.
 * - SENT dispatches never send again (already_sent).
 * - A PENDING row owned by another worker is not sent concurrently (busy).
 * - FAILED rows retry atomically while attempts remain (bounded).
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

  const attempts = dispatchRecord.attemptCount ?? 0;
  if (dispatchRecord.status === "FAILED" && attempts >= MAX_DISPATCH_ATTEMPTS) {
    return { outcome: "exhausted" };
  }
  if (dispatchRecord.status === "PENDING" && !freshClaim) {
    return { outcome: "busy" };
  }

  try {
    const providerResult = await bot.sendReviewCard(card);
    await database
      .update(editorialReviewDispatches)
      .set({
        status: "SENT",
        providerMessageId: providerResult.providerMessageId,
        attemptCount: attempts + 1,
        updatedAt: new Date(),
        sentAt: new Date(),
      })
      .where(eq(editorialReviewDispatches.candidateId, candidateId));
    await database
      .update(candidates)
      .set({ status: "REVIEW" })
      .where(eq(candidates.id, candidateId));
    return { outcome: "sent", providerMessageId: providerResult.providerMessageId };
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
}
