import { createHash } from "node:crypto";
import { loadEnvironment } from "@/server/config/env";
import { getDatabase } from "@/server/db/client";
import {
  projectSnapshots,
  projects,
  providerIdentities,
  releases,
  sourceEvents,
} from "@/server/db/schema";
import { GitHubClient } from "@/server/modules/github/client";
import { normalizeRelease, normalizeRepository } from "@/server/modules/github/normalize";

function observationBucket(date: Date): Date {
  return new Date(Math.floor(date.getTime() / 300000) * 300000);
}

export async function discoverGitHubRepositories(query: string, page = 1) {
  const database = getDatabase();
  const config = loadEnvironment();
  const client = new GitHubClient({
    token: config.GITHUB_TOKEN,
    timeoutMs: config.GITHUB_API_TIMEOUT_MS,
    maxRetries: config.GITHUB_MAX_RETRIES,
  });
  const result = await client.searchRepositories(query, page);
  const now = new Date();

  return database.transaction(async (transaction) => {
    const persisted = [];
    for (const rawRepository of result.items) {
      const repository = normalizeRepository(rawRepository);
      const slug = `github-${repository.providerObjectId}-${repository.name.toLowerCase().replace(/[^a-z0-9-]+/g, "-")}`;
      const [project] = await transaction
        .insert(projects)
        .values({
          slug,
          name: repository.name,
          description: repository.description,
          primaryCategory: repository.category,
          firstSeenAt: repository.createdAtProvider,
          lastSeenAt: now,
        })
        .onConflictDoUpdate({
          target: projects.slug,
          set: {
            name: repository.name,
            description: repository.description,
            primaryCategory: repository.category,
            lastSeenAt: now,
            updatedAt: now,
          },
        })
        .returning({ id: projects.id });
      await transaction
        .insert(providerIdentities)
        .values({
          projectId: project.id,
          provider: "github",
          providerObjectId: repository.providerObjectId,
          providerOwner: repository.owner,
          providerName: repository.name,
          providerFullName: repository.fullName,
          providerUrl: repository.url,
          firstSeenAt: now,
          lastSeenAt: now,
        })
        .onConflictDoUpdate({
          target: [providerIdentities.provider, providerIdentities.providerObjectId],
          set: { projectId: project.id, lastSeenAt: now, updatedAt: now },
        });
      const sourceKey = `search:${query}:${page}:${repository.providerObjectId}`;
      await transaction
        .insert(sourceEvents)
        .values({
          provider: "github",
          sourceKind: "repository_search",
          sourceKey,
          retrievedAt: now,
          status: "success",
          payloadHash: createHash("sha256").update(JSON.stringify(rawRepository)).digest("hex"),
          normalizedMetadata: { query, page },
        })
        .onConflictDoUpdate({
          target: [sourceEvents.provider, sourceEvents.sourceKey],
          set: {
            retrievedAt: now,
            status: "success",
            payloadHash: createHash("sha256").update(JSON.stringify(rawRepository)).digest("hex"),
            normalizedMetadata: { query, page },
          },
        });
      persisted.push(project.id);
    }
    return { discovered: result.items.length, projectIds: persisted };
  });
}

export async function refreshGitHubRepository(owner: string, name: string) {
  const database = getDatabase();
  const config = loadEnvironment();
  const client = new GitHubClient({
    token: config.GITHUB_TOKEN,
    timeoutMs: config.GITHUB_API_TIMEOUT_MS,
    maxRetries: config.GITHUB_MAX_RETRIES,
  });
  const [rawRepository, rawReleases] = await Promise.all([
    client.getRepository(owner, name),
    client.listReleases(owner, name),
  ]);
  const repository = normalizeRepository(rawRepository);
  const now = new Date();
  const observedAt = observationBucket(now);

  return database.transaction(async (transaction) => {
    const slug = `github-${repository.providerObjectId}-${repository.name.toLowerCase().replace(/[^a-z0-9-]+/g, "-")}`;
    const [project] = await transaction
      .insert(projects)
      .values({
        slug,
        name: repository.name,
        description: repository.description,
        primaryCategory: repository.category,
        firstSeenAt: repository.createdAtProvider,
        lastSeenAt: now,
      })
      .onConflictDoUpdate({
        target: projects.slug,
        set: {
          name: repository.name,
          description: repository.description,
          primaryCategory: repository.category,
          lastSeenAt: now,
          updatedAt: now,
        },
      })
      .returning({ id: projects.id });
    await transaction
      .insert(providerIdentities)
      .values({
        projectId: project.id,
        provider: "github",
        providerObjectId: repository.providerObjectId,
        providerOwner: repository.owner,
        providerName: repository.name,
        providerFullName: repository.fullName,
        providerUrl: repository.url,
        firstSeenAt: now,
        lastSeenAt: now,
      })
      .onConflictDoUpdate({
        target: [providerIdentities.provider, providerIdentities.providerObjectId],
        set: { projectId: project.id, lastSeenAt: now, updatedAt: now },
      });
    const sourceKey = `refresh:${repository.fullName}:${observedAt.toISOString()}`;
    const payloadHash = createHash("sha256")
      .update(JSON.stringify({ repository: rawRepository, releases: rawReleases }))
      .digest("hex");
    const [sourceEvent] = await transaction
      .insert(sourceEvents)
      .values({
        provider: "github",
        sourceKind: "repository_refresh",
        sourceKey,
        retrievedAt: now,
        status: "success",
        payloadHash,
        normalizedMetadata: { owner, name, releaseCount: rawReleases.length },
      })
      .onConflictDoUpdate({
        target: [sourceEvents.provider, sourceEvents.sourceKey],
        set: {
          retrievedAt: now,
          status: "success",
          payloadHash,
          normalizedMetadata: { owner, name, releaseCount: rawReleases.length },
        },
      })
      .returning({ id: sourceEvents.id });
    await transaction
      .insert(projectSnapshots)
      .values({
        projectId: project.id,
        sourceEventId: sourceEvent.id,
        observedAt,
        stars: repository.stars,
        forks: repository.forks,
        openIssues: repository.openIssues,
        watchers: repository.watchers,
      })
      .onConflictDoUpdate({
        target: [projectSnapshots.projectId, projectSnapshots.observedAt],
        set: {
          sourceEventId: sourceEvent.id,
          stars: repository.stars,
          forks: repository.forks,
          openIssues: repository.openIssues,
          watchers: repository.watchers,
        },
      });
    for (const rawRelease of rawReleases) {
      const release = normalizeRelease(rawRelease);
      await transaction
        .insert(releases)
        .values({
          projectId: project.id,
          providerReleaseId: release.providerReleaseId,
          tagName: release.tagName,
          name: release.name,
          publishedAt: release.publishedAt,
          isPrerelease: release.isPrerelease,
          isDraft: release.isDraft,
          summary: release.summary,
          sourceEventId: sourceEvent.id,
        })
        .onConflictDoUpdate({
          target: [releases.projectId, releases.providerReleaseId],
          set: {
            tagName: release.tagName,
            name: release.name,
            publishedAt: release.publishedAt,
            isPrerelease: release.isPrerelease,
            isDraft: release.isDraft,
            summary: release.summary,
            sourceEventId: sourceEvent.id,
          },
        });
    }
    return { projectId: project.id, observedAt, releases: rawReleases.length };
  });
}
