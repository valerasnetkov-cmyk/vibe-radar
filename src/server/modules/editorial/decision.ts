import { and, eq, inArray } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { candidates, editorialDecisions } from "@/server/db/schema";
import { authorizeEditor, parseEditorCallback } from "@/server/modules/telegram/editor-callback";

const transitions = { approve: "APPROVED", watch: "WATCHING", reject: "REJECTED" } as const;
const decisions = { approve: "APPROVE", watch: "WATCH", reject: "REJECT" } as const;

export class EditorialDecisionError extends Error {}

export async function applyEditorCallback(
  payload: string,
  actorId: string,
  allowedEditorIds: ReadonlySet<string>,
  note?: string,
) {
  const callback = parseEditorCallback(payload);
  authorizeEditor(actorId, allowedEditorIds);
  const database = getDatabase();
  return database.transaction(async (transaction) => {
    const [candidate] = await transaction
      .update(candidates)
      .set({ status: transitions[callback.action] })
      .where(
        and(
          eq(candidates.id, callback.candidateId),
          inArray(candidates.status, ["CANDIDATE", "REVIEW"]),
        ),
      )
      .returning({ id: candidates.id });
    if (!candidate) throw new EditorialDecisionError("Invalid or stale candidate transition");
    const [decision] = await transaction
      .insert(editorialDecisions)
      .values({
        candidateId: candidate.id,
        editorActorId: actorId,
        decision: decisions[callback.action],
        note: note?.slice(0, 500),
      })
      .returning({ id: editorialDecisions.id });
    return {
      candidateId: candidate.id,
      decisionId: decision.id,
      status: transitions[callback.action],
    };
  });
}
