import { describe, expect, it, vi } from "vitest";
import type { getDatabase } from "@/server/db/client";
import { dispatchCandidateForReviewService } from "@/server/modules/editorial/dispatch-service";

type FakeDatabase = ReturnType<typeof getDatabase>;

const CARD = { text: "card", inlineKeyboard: [] };
const CANDIDATE_ID = "00000000-0000-4000-8000-000000000003";

function makeFakeDatabase(options: {
  freshClaimRow: Record<string, unknown> | null;
  existingRow: Record<string, unknown> | null;
  failSentUpdate: boolean;
  failAnnotationUpdate?: boolean;
}): { database: FakeDatabase; updateSets: Record<string, unknown>[] } {
  const updateSets: Record<string, unknown>[] = [];
  const updateStub = () => ({
    set: (values: Record<string, unknown>) => {
      updateSets.push(values);
      return {
        where: async () => {
          if (values.status === "SENT" && options.failSentUpdate) {
            throw new Error("database unavailable after delivery");
          }
          if (values.status === undefined && options.failAnnotationUpdate) {
            throw new Error("database unavailable");
          }
          return [];
        },
      };
    },
  });
  const database = {
    insert: () => ({
      values: () => ({
        onConflictDoNothing: () => ({
          returning: async () => (options.freshClaimRow ? [options.freshClaimRow] : []),
        }),
      }),
    }),
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => (options.existingRow ? [options.existingRow] : []),
        }),
      }),
    }),
    update: updateStub,
    transaction: async (work: (tx: unknown) => Promise<void>) => {
      await work({ update: updateStub });
    },
  };
  return { database: database as unknown as FakeDatabase, updateSets };
}

describe("dispatch send vs finalization failure boundary", () => {
  it("does not mark FAILED when Telegram succeeds but DB finalization fails", async () => {
    const { database, updateSets } = makeFakeDatabase({
      freshClaimRow: { candidateId: CANDIDATE_ID, status: "PENDING", attemptCount: 0 },
      existingRow: null,
      failSentUpdate: true,
    });
    const sendReviewCard = vi.fn(async () => ({ providerMessageId: "mid-9" }));

    const outcome = await dispatchCandidateForReviewService(database, CANDIDATE_ID, CARD, {
      sendReviewCard,
    });

    expect(sendReviewCard).toHaveBeenCalledTimes(1);
    expect(outcome).toEqual({ outcome: "finalization_failed", providerMessageId: "mid-9" });
    // The dispatch row must NOT be rewritten as a provider failure.
    expect(updateSets.some((values) => values.status === "FAILED")).toBe(false);
    // A reconciliation marker is recorded without changing lifecycle status.
    expect(
      updateSets.some(
        (values) => values.lastErrorCode === "FINALIZATION_FAILED" && values.status === undefined,
      ),
    ).toBe(true);
  });

  it("does not call Telegram again after a finalization failure", async () => {
    const sendReviewCard = vi.fn(async () => ({ providerMessageId: "mid-9" }));
    const first = makeFakeDatabase({
      freshClaimRow: { candidateId: CANDIDATE_ID, status: "PENDING", attemptCount: 0 },
      existingRow: null,
      failSentUpdate: true,
    });
    const firstOutcome = await dispatchCandidateForReviewService(
      first.database,
      CANDIDATE_ID,
      CARD,
      { sendReviewCard },
    );
    expect(firstOutcome.outcome).toBe("finalization_failed");

    // The row remains PENDING/reconciliation-required; a second worker must
    // observe it as owned-elsewhere and return without another provider call.
    const second = makeFakeDatabase({
      freshClaimRow: null,
      existingRow: {
        candidateId: CANDIDATE_ID,
        status: "PENDING",
        attemptCount: 0,
        lastErrorCode: "FINALIZATION_FAILED",
      },
      failSentUpdate: false,
    });
    const secondOutcome = await dispatchCandidateForReviewService(
      second.database,
      CANDIDATE_ID,
      CARD,
      { sendReviewCard },
    );
    expect(secondOutcome).toEqual({ outcome: "busy" });
    expect(sendReviewCard).toHaveBeenCalledTimes(1);
  });

  it("still reports finalization_failed when the reconciliation marker cannot be written", async () => {
    const { database, updateSets } = makeFakeDatabase({
      freshClaimRow: { candidateId: CANDIDATE_ID, status: "PENDING", attemptCount: 0 },
      existingRow: null,
      failSentUpdate: true,
      failAnnotationUpdate: true,
    });
    const sendReviewCard = vi.fn(async () => ({ providerMessageId: "mid-9" }));
    const outcome = await dispatchCandidateForReviewService(database, CANDIDATE_ID, CARD, {
      sendReviewCard,
    });
    expect(outcome).toEqual({ outcome: "finalization_failed", providerMessageId: "mid-9" });
    expect(updateSets.some((values) => values.status === "FAILED")).toBe(false);
  });
});
