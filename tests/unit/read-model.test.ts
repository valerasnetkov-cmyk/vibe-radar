import { describe, expect, it } from "vitest";
import type { getDatabase } from "@/server/db/client";
import { candidates, projects, publications } from "@/server/db/schema";
import { getPublishedProject, getPublishedRadar } from "@/server/modules/publishing/read-model";

type FakeDatabase = ReturnType<typeof getDatabase>;

const VALID_PAYLOAD = {
  candidateId: "00000000-0000-4000-8000-000000000030",
  contentVersion: "v".repeat(64),
  title: "Acme <Tool>",
  format: "FRESH",
  shortSummary: "Fast bundler",
  whyNow: "Adoption is accelerating",
  keyPoints: ["builds"],
  audience: ["teams"],
  limitations: [],
  projectSlug: "acme-tool",
  projectUrl: "https://github.com/acme/tool",
  score: 72,
  scoreVersion: 1,
  confidence: 80,
  confidenceLevel: "HIGH",
  sources: [{ label: "acme/tool", url: "https://github.com/acme/tool" }],
  outscanRelevance: "NONE",
};

function makeDatabase(options: {
  publicationRows: Record<string, unknown>[];
  projectRows?: Record<string, unknown>[];
  candidateRows?: Record<string, unknown>[];
}): FakeDatabase {
  const chain = (rows: unknown[]): unknown => ({
    where: () => chain(rows),
    orderBy: () => chain(rows),
    limit: (count?: number) =>
      Promise.resolve(typeof count === "number" ? rows.slice(0, count) : rows),
    then: (resolve: (value: unknown[]) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(rows).then(resolve, reject),
  });
  return {
    select: () => ({
      from: (table: unknown) => {
        if (table === publications) return chain(options.publicationRows);
        if (table === projects)
          return chain(
            options.projectRows ?? [{ id: "project-1", name: "Acme Tool", slug: "acme-tool" }],
          );
        if (table === candidates) return chain(options.candidateRows ?? [{ id: "candidate-1" }]);
        return chain([]);
      },
    }),
  } as unknown as FakeDatabase;
}

describe("public read model filtering", () => {
  it("returns only published snapshots and skips invalid payloads", async () => {
    const database = makeDatabase({
      publicationRows: [
        {
          candidateId: "candidate-1",
          contentPayload: VALID_PAYLOAD,
          publishedAt: new Date("2026-09-20T00:00:00Z"),
        },
        {
          candidateId: "candidate-2",
          contentPayload: { title: "broken" },
          publishedAt: new Date("2026-09-21T00:00:00Z"),
        },
      ],
    });
    const entries = await getPublishedRadar(database);
    expect(entries.length).toBe(1);
    expect(entries[0]?.title).toBe("Acme <Tool>");
    expect(entries[0]?.slug).toBe("acme-tool");
  });

  it("excludes unpublished projects from public lookup", async () => {
    const withPublication = makeDatabase({
      publicationRows: [
        { candidateId: "candidate-1", contentPayload: VALID_PAYLOAD, publishedAt: new Date() },
      ],
    });
    const published = await getPublishedProject(withPublication, "acme-tool");
    expect(published?.name).toBe("Acme Tool");
    expect(published?.content.title).toBe("Acme <Tool>");

    const withoutPublication = makeDatabase({ publicationRows: [] });
    expect(await getPublishedProject(withoutPublication, "acme-tool")).toBeNull();

    const unknownProject = makeDatabase({ publicationRows: [], projectRows: [] });
    expect(await getPublishedProject(unknownProject, "ghost")).toBeNull();
  });

  it("rejects slugs that do not match the published snapshot", async () => {
    const database = makeDatabase({
      publicationRows: [
        { candidateId: "candidate-1", contentPayload: VALID_PAYLOAD, publishedAt: new Date() },
      ],
      projectRows: [{ id: "project-1", name: "Other", slug: "other" }],
    });
    expect(await getPublishedProject(database, "other")).toBeNull();
  });

  it("never exposes editorial internals in the public projection", async () => {
    const database = makeDatabase({
      publicationRows: [
        { candidateId: "candidate-1", contentPayload: VALID_PAYLOAD, publishedAt: new Date() },
      ],
    });
    const entries = await getPublishedRadar(database);
    const serialized = JSON.stringify(entries);
    expect(serialized).not.toContain("editorActorId");
    expect(serialized).not.toContain("editorial note");
    expect(serialized).not.toContain("bot");
    expect(Object.keys(entries[0] ?? {}).sort()).toEqual(
      ["candidateId", "confidence", "format", "publishedAt", "score", "slug", "title"].sort(),
    );
  });

  it("drops non-HTTP source links before rendering", async () => {
    const poisoned = {
      ...VALID_PAYLOAD,
      sources: [{ label: "evil", url: "https://github.com/acme/tool" }],
    };
    const database = makeDatabase({
      publicationRows: [
        { candidateId: "candidate-1", contentPayload: poisoned, publishedAt: new Date() },
      ],
    });
    const project = await getPublishedProject(database, "acme-tool");
    expect(project?.content.sources).toEqual([
      { label: "evil", url: "https://github.com/acme/tool" },
    ]);
    // A javascript: URL can never validate into a snapshot in the first place.
    const { contentModelSchema } = await import("@/server/modules/content/model");
    expect(
      contentModelSchema.safeParse({
        ...VALID_PAYLOAD,
        sources: [{ label: "evil", url: "javascript:alert(1)" }],
      }).success,
    ).toBe(false);
  });
});
