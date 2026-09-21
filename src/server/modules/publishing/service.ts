import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { candidates, editorialDecisions, publications } from "@/server/db/schema";
import type { ContentModel } from "@/server/modules/content/model";

export type PublicationAdapter = {
  publish(chatId: string, html: string): Promise<{ providerMessageId: string }>;
};

export function publicationIdempotencyKey(content: ContentModel, channel: string): string {
  return createHash("sha256")
    .update(`${content.candidateId}:${channel}:${content.contentVersion}`)
    .digest("hex");
}

export async function publishApprovedContent(
  content: ContentModel,
  channel: string,
  decisionId: string,
  chatId: string,
  html: string,
  adapter: PublicationAdapter,
) {
  const database = getDatabase();
  const key = publicationIdempotencyKey(content, channel);
  const [candidate] = await database
    .select({ status: candidates.status })
    .from(candidates)
    .where(eq(candidates.id, content.candidateId));
  if (candidate?.status !== "APPROVED") throw new Error("Candidate is not approved");
  const [decision] = await database
    .select({ decision: editorialDecisions.decision })
    .from(editorialDecisions)
    .where(
      and(
        eq(editorialDecisions.id, decisionId),
        eq(editorialDecisions.candidateId, content.candidateId),
      ),
    );
  if (decision?.decision !== "APPROVE") throw new Error("Editorial approval is required");
  const [publication] = await database
    .insert(publications)
    .values({
      candidateId: content.candidateId,
      editorialDecisionId: decisionId,
      channel,
      contentVersion: content.contentVersion,
      idempotencyKey: key,
      status: "pending",
    })
    .onConflictDoNothing({ target: publications.idempotencyKey })
    .returning({ id: publications.id });
  if (!publication) return { published: false, duplicate: true };
  try {
    const result = await adapter.publish(chatId, html);
    await database
      .update(publications)
      .set({
        status: "published",
        providerMessageId: result.providerMessageId,
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(publications.id, publication.id));
    return { published: true, duplicate: false, providerMessageId: result.providerMessageId };
  } catch (error) {
    await database
      .update(publications)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(publications.id, publication.id));
    throw error;
  }
}
