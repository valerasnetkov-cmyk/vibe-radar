import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/server/db/client";
import {
  mechanicEvidence,
  mechanicReviews,
  productMechanics,
  projects,
  providerIdentities,
  sourceEvents,
} from "@/server/db/schema";
import { normalizeMechanicKey } from "@/server/modules/mechanics/identity";
import { listPublicMechanics } from "@/server/modules/mechanics/public-read-model";
import { submitMechanicProposal } from "@/server/modules/mechanics/repository";
import { reviewMechanic } from "@/server/modules/mechanics/review";
import type { MechanicProposal } from "@/server/modules/mechanics/contract";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const maybe = hasDatabase ? describe : describe.skip;

function uniqueKey(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

maybe("Stage 10 evidence-backed mechanic radar", () => {
  const mechanicIds: string[] = [];
  const projectIds: string[] = [];
  const eventIds: string[] = [];

  beforeAll(() => {
    if (!hasDatabase) {
      console.warn("DATABASE_URL is not set; PostgreSQL integration tests were not executed");
    }
  });

  afterAll(async () => {
    if (!hasDatabase) return;
    const database = getDatabase();
    try {
      for (const id of mechanicIds) {
        await database
          .delete(mechanicReviews)
          .where(eq(mechanicReviews.mechanicId, id))
          .catch(() => undefined);
        await database
          .delete(mechanicEvidence)
          .where(eq(mechanicEvidence.mechanicId, id))
          .catch(() => undefined);
        await database
          .delete(productMechanics)
          .where(eq(productMechanics.id, id))
          .catch(() => undefined);
      }
      for (const id of eventIds) {
        await database
          .delete(sourceEvents)
          .where(eq(sourceEvents.id, id))
          .catch(() => undefined);
      }
      for (const id of projectIds) {
        await database
          .delete(providerIdentities)
          .where(eq(providerIdentities.projectId, id))
          .catch(() => undefined);
        await database
          .delete(projects)
          .where(eq(projects.id, id))
          .catch(() => undefined);
      }
    } finally {
      await closeDatabase();
    }
  });

  async function createProject(name: string): Promise<{ projectId: string; eventId: string }> {
    const database = getDatabase();
    const slug = uniqueKey(name).toLowerCase().replaceAll("_", "-");
    const [project] = await database
      .insert(projects)
      .values({
        slug,
        name: `Stage10 ${slug}`,
        status: "active",
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      })
      .returning({ id: projects.id });
    if (!project) throw new Error("fixture project insert failed");
    projectIds.push(project.id);
    const [event] = await database
      .insert(sourceEvents)
      .values({
        provider: "github",
        sourceKind: "repository",
        sourceKey: uniqueKey("source"),
        retrievedAt: new Date(),
        status: "ok",
      })
      .returning({ id: sourceEvents.id });
    if (!event) throw new Error("fixture source event insert failed");
    eventIds.push(event.id);
    await database.insert(providerIdentities).values({
      projectId: project.id,
      provider: "github",
      providerObjectId: uniqueKey("repo"),
      providerOwner: "stage10",
      providerName: slug,
      providerFullName: `stage10/${slug}`,
      providerUrl: `https://github.com/stage10/${slug}`,
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
    });
    return { projectId: project.id, eventId: event.id };
  }

  function proposalFor(
    name: string,
    refs: Array<{ projectId?: string; sourceEventId?: string }>,
  ): MechanicProposal {
    return {
      canonicalName: name,
      description: "A repeated confirmation interaction before risky actions.",
      evidence: refs.map((ref, index) => ({ ...ref, signalId: `sig-${index}`, strength: 70 })),
      affectedCategories: ["agents"],
      practicalImplications: ["Add explicit human control"],
      risks: ["May slow automation"],
    };
  }

  async function approveMechanic(mechanicId: string): Promise<void> {
    const database = getDatabase();
    await reviewMechanic(database, mechanicId, "APPROVE", "editor-1");
  }

  it("creates one mechanic row for concurrent identical proposals", async () => {
    const database = getDatabase();
    const first = await createProject("racea");
    const name = `Race Mechanic ${Date.now()}`;
    const [one, two] = await Promise.all([
      submitMechanicProposal(database, proposalFor(name, [first])),
      submitMechanicProposal(database, proposalFor(name, [first])),
    ]);
    mechanicIds.push(one.mechanicId);
    expect(one.mechanicId).toBe(two.mechanicId);
    const rows = await database
      .select({ id: productMechanics.id })
      .from(productMechanics)
      .where(eq(productMechanics.canonicalKey, normalizeMechanicKey(name)));
    expect(rows).toHaveLength(1);
  });

  it("keeps evidence idempotent across duplicate retries", async () => {
    const database = getDatabase();
    const first = await createProject("dup");
    const name = `Dedupe Mechanic ${Date.now()}`;
    const proposal = proposalFor(name, [first]);
    const initial = await submitMechanicProposal(database, proposal);
    mechanicIds.push(initial.mechanicId);
    const retry = await submitMechanicProposal(database, proposal);
    expect(retry.mechanicId).toBe(initial.mechanicId);
    expect(retry.insertedEvidence).toBe(0);
    expect(retry.assessment).toEqual(initial.assessment);
    const rows = await database
      .select({ id: mechanicEvidence.id })
      .from(mechanicEvidence)
      .where(eq(mechanicEvidence.mechanicId, initial.mechanicId));
    expect(rows).toHaveLength(1);
  });

  it("merges multiple source events of one project into one group", async () => {
    const database = getDatabase();
    const first = await createProject("samea");
    const second = await createProject("sameb");
    void second;
    const database2 = getDatabase();
    const [extra] = await database2
      .insert(sourceEvents)
      .values({
        provider: "github",
        sourceKind: "release",
        sourceKey: uniqueKey("source"),
        retrievedAt: new Date(),
        status: "ok",
      })
      .returning({ id: sourceEvents.id });
    if (!extra) throw new Error("fixture event insert failed");
    eventIds.push(extra.id);
    const name = `Single Group ${Date.now()}`;
    const result = await submitMechanicProposal(
      database,
      proposalFor(name, [
        { projectId: first.projectId, sourceEventId: first.eventId },
        { projectId: first.projectId, sourceEventId: extra.id },
      ]),
    );
    mechanicIds.push(result.mechanicId);
    expect(result.assessment.independentSourceCount).toBe(1);
    expect(result.assessment.evidenceCount).toBe(2);
  });

  it("counts two distinct trusted projects as two groups", async () => {
    const database = getDatabase();
    const first = await createProject("pairone");
    const second = await createProject("pairtwo");
    const name = `Pair Mechanic ${Date.now()}`;
    const result = await submitMechanicProposal(database, proposalFor(name, [first, second]));
    mechanicIds.push(result.mechanicId);
    expect(result.assessment.independentSourceCount).toBe(2);
  });

  it("rejects unknown references without inflating mechanics", async () => {
    const database = getDatabase();
    const real = await createProject("realone");
    const name = `Unknown Refs ${Date.now()}`;
    const result = await submitMechanicProposal(
      database,
      proposalFor(name, [
        real,
        { projectId: "00000000-0000-4000-8000-00000000ffff" },
        { sourceEventId: "00000000-0000-4000-8000-00000000eeee" },
      ]),
    );
    mechanicIds.push(result.mechanicId);
    expect(result.resolvedCount).toBe(1);
    expect(result.skippedCount).toBe(2);
    expect(result.assessment.independentSourceCount).toBe(1);
  });

  it("reassesses from stored evidence as new projects arrive", async () => {
    const database = getDatabase();
    const first = await createProject("growone");
    const name = `Growing Mechanic ${Date.now()}`;
    const initial = await submitMechanicProposal(database, proposalFor(name, [first]));
    mechanicIds.push(initial.mechanicId);
    expect(initial.assessment.stage).toBe("SPARK");
    const second = await createProject("growtwo");
    const third = await createProject("growthree");
    const grown = await submitMechanicProposal(database, proposalFor(name, [second, third]));
    expect(grown.mechanicId).toBe(initial.mechanicId);
    expect(grown.created).toBe(false);
    expect(grown.assessment.independentSourceCount).toBe(3);
    expect(grown.assessment.stage).toBe("RISING");
  });

  it("publishes approved mechanics that satisfy every threshold", async () => {
    const database = getDatabase();
    const first = await createProject("pubone");
    const second = await createProject("pubtwo");
    const name = `Public Mechanic ${Date.now()}`;
    const result = await submitMechanicProposal(database, proposalFor(name, [first, second]));
    mechanicIds.push(result.mechanicId);
    await approveMechanic(result.mechanicId);
    const visible = await listPublicMechanics(database);
    const card = visible.find((entry) => entry.id === result.mechanicId);
    expect(card?.independentSourceCount).toBe(2);
    expect(card?.sources).toHaveLength(2);
    expect(card?.stage).toBe("SPARK");
  });

  it("hides mechanics after a later REJECT", async () => {
    const database = getDatabase();
    const first = await createProject("flipone");
    const second = await createProject("fliptwo");
    const name = `Flipped Mechanic ${Date.now()}`;
    const result = await submitMechanicProposal(database, proposalFor(name, [first, second]));
    mechanicIds.push(result.mechanicId);
    await approveMechanic(result.mechanicId);
    expect(
      (await listPublicMechanics(database)).some((entry) => entry.id === result.mechanicId),
    ).toBe(true);
    await reviewMechanic(database, result.mechanicId, "REJECT", "editor-2", "False positive");
    expect(
      (await listPublicMechanics(database)).some((entry) => entry.id === result.mechanicId),
    ).toBe(false);
  });

  it("hides ACTIVE mechanics without review and one-source SPARKs", async () => {
    const database = getDatabase();
    const first = await createProject("quietone");
    const second = await createProject("quiettwo");
    const unreviewed = await submitMechanicProposal(
      database,
      proposalFor(`Unreviewed ${Date.now()}`, [first, second]),
    );
    mechanicIds.push(unreviewed.mechanicId);
    const spark = await submitMechanicProposal(
      database,
      proposalFor(`Lonely Spark ${Date.now()}`, [first]),
    );
    mechanicIds.push(spark.mechanicId);
    await approveMechanic(spark.mechanicId);
    const visible = await listPublicMechanics(database);
    expect(visible.some((entry) => entry.id === unreviewed.mechanicId)).toBe(false);
    expect(visible.some((entry) => entry.id === spark.mechanicId)).toBe(false);
  });

  it("hides archived mechanics even with approval", async () => {
    const database = getDatabase();
    const first = await createProject("archone");
    const second = await createProject("archtwo");
    const name = `Archived Mechanic ${Date.now()}`;
    const result = await submitMechanicProposal(database, proposalFor(name, [first, second]));
    mechanicIds.push(result.mechanicId);
    await approveMechanic(result.mechanicId);
    await database
      .update(productMechanics)
      .set({ status: "ARCHIVED" })
      .where(eq(productMechanics.id, result.mechanicId));
    expect(
      (await listPublicMechanics(database)).some((entry) => entry.id === result.mechanicId),
    ).toBe(false);
  });

  it("keeps concurrent evidence submissions duplicate-free", async () => {
    const database = getDatabase();
    const first = await createProject("concone");
    const second = await createProject("conctwo");
    const name = `Concurrent Evidence ${Date.now()}`;
    const proposal = proposalFor(name, [first, second]);
    const [one, two] = await Promise.all([
      submitMechanicProposal(database, proposal),
      submitMechanicProposal(database, proposal),
    ]);
    mechanicIds.push(one.mechanicId);
    expect(one.mechanicId).toBe(two.mechanicId);
    const rows = await database
      .select({ id: mechanicEvidence.id })
      .from(mechanicEvidence)
      .where(eq(mechanicEvidence.mechanicId, one.mechanicId));
    expect(rows).toHaveLength(2);
    expect(one.assessment.independentSourceCount).toBe(2);
    expect(two.assessment.independentSourceCount).toBe(2);
  });
});
