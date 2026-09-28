import { describe, expect, it } from "vitest";
import type { getDatabase } from "@/server/db/client";
import { projects, sourceEvents } from "@/server/db/schema";
import {
  deriveIndependenceGroup,
  resolveMechanicEvidence,
  UNRESOLVED_GROUP,
} from "@/server/modules/mechanics/evidence";

type FakeDatabase = ReturnType<typeof getDatabase>;

const PROJECT_ID = "00000000-0000-4000-8000-0000000000c1";
const EVENT_ID = "00000000-0000-4000-8000-0000000000d2";

function makeDatabase(options: {
  project?: Record<string, unknown> | null;
  event?: Record<string, unknown> | null;
}): FakeDatabase {
  const chain = (rows: unknown[]): unknown => ({
    where: () => chain(rows),
    orderBy: () => chain(rows),
    limit: (count?: number) =>
      Promise.resolve(typeof count === "number" ? rows.slice(0, count) : rows),
  });
  return {
    select: () => ({
      from: (table: unknown) => {
        if (table === projects) return chain(options.project ? [options.project] : []);
        if (table === sourceEvents) return chain(options.event ? [options.event] : []);
        return chain([]);
      },
    }),
  } as unknown as FakeDatabase;
}

describe("server-derived independence grouping", () => {
  it("merges every observation of one project into one group", () => {
    const group = deriveIndependenceGroup(PROJECT_ID);
    expect(group).toBe(`project:${PROJECT_ID}`);
    expect(deriveIndependenceGroup(PROJECT_ID)).toBe(group);
  });

  it("marks project-less evidence unresolved", () => {
    expect(deriveIndependenceGroup(null)).toBe(UNRESOLVED_GROUP);
  });
});

describe("trusted evidence resolution", () => {
  const project = {
    id: PROJECT_ID,
    firstSeenAt: new Date("2026-09-01T00:00:00Z"),
    lastSeenAt: new Date("2026-09-10T00:00:00Z"),
  };
  const event = { id: EVENT_ID, retrievedAt: new Date("2026-09-12T00:00:00Z") };

  it("resolves known references with trusted timestamps", async () => {
    const database = makeDatabase({ project, event });
    const resolution = await resolveMechanicEvidence(database, [
      { projectId: PROJECT_ID, signalId: "sig-1", strength: 80 },
      { projectId: PROJECT_ID, sourceEventId: EVENT_ID },
    ]);
    expect(resolution.skipped).toEqual([]);
    expect(resolution.resolved).toHaveLength(2);
    expect(resolution.resolved[0]?.group).toBe(`project:${PROJECT_ID}`);
    expect(resolution.resolved[0]?.resolved).toBe(true);
    // Source retrieval time outranks the project rollup timestamp.
    expect(resolution.resolved[1]?.observedAt).toEqual(event.retrievedAt);
    expect(resolution.resolved[0]?.observedAt).toEqual(project.lastSeenAt);
  });

  it("skips fake project and event ids deterministically", async () => {
    const database = makeDatabase({ project: null, event: null });
    const resolution = await resolveMechanicEvidence(database, [
      { projectId: "00000000-0000-4000-8000-00000000ffff" },
      { sourceEventId: "00000000-0000-4000-8000-00000000eeee" },
    ]);
    expect(resolution.resolved).toEqual([]);
    expect(resolution.skipped).toEqual([
      { index: 0, reason: "unknown-reference" },
      { index: 1, reason: "unknown-reference" },
    ]);
  });

  it("skips anchor-less signal ids and never trusts proposal timestamps", async () => {
    const database = makeDatabase({ project, event });
    const resolution = await resolveMechanicEvidence(database, [{ signalId: "sig-only" }]);
    expect(resolution.resolved).toEqual([]);
    expect(resolution.skipped).toEqual([{ index: 0, reason: "no-persisted-anchor" }]);
  });

  it("bounds proposal strength as metadata only", async () => {
    const database = makeDatabase({ project, event });
    const resolution = await resolveMechanicEvidence(database, [
      { projectId: PROJECT_ID, strength: 500 },
    ]);
    expect(resolution.resolved[0]?.strength).toBe(100);
    expect(resolution.resolved[0]?.group).toBe(`project:${PROJECT_ID}`);
  });
});
