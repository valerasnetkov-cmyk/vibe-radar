import { and, desc, eq, inArray } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { candidates, projects, publications } from "@/server/db/schema";
import { contentModelSchema, type ContentModel } from "@/server/modules/content/model";

export type PublishedRadarEntry = {
  candidateId: string;
  slug: string;
  title: string;
  format: ContentModel["format"];
  score: number;
  confidence: number;
  publishedAt: Date;
};

export type PublishedProject = {
  projectId: string;
  name: string;
  slug: string;
  candidateId: string;
  content: ContentModel;
  publishedAt: Date;
};

function isHttpUrl(value: string): boolean {
  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Public read model. Returns ONLY published canonical snapshots:
 * unpublished candidates, editorial notes, editor identities, and raw
 * provider payloads can never surface here. Invalid snapshots are
 * skipped, and non-HTTP(S) source links are dropped before rendering.
 */
export async function getPublishedRadar(
  database: ReturnType<typeof getDatabase> = getDatabase(),
  limit = 50,
): Promise<PublishedRadarEntry[]> {
  const rows = await database
    .select({
      candidateId: publications.candidateId,
      contentPayload: publications.contentPayload,
      publishedAt: publications.publishedAt,
    })
    .from(publications)
    .where(eq(publications.status, "published"))
    .orderBy(desc(publications.publishedAt))
    .limit(limit);
  const entries: PublishedRadarEntry[] = [];
  for (const row of rows) {
    const parsed = contentModelSchema.safeParse(row.contentPayload);
    if (!parsed.success || !row.publishedAt) continue;
    const model = parsed.data;
    entries.push({
      candidateId: row.candidateId,
      slug: model.projectSlug,
      title: model.title,
      format: model.format,
      score: model.score,
      confidence: model.confidence,
      publishedAt: row.publishedAt,
    });
  }
  return entries;
}

export async function getPublishedProject(
  database: ReturnType<typeof getDatabase> = getDatabase(),
  slug: string,
): Promise<PublishedProject | null> {
  const [project] = await database
    .select({ id: projects.id, name: projects.name, slug: projects.slug })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1);
  if (!project) return null;
  const approved = await database
    .select({ id: candidates.id })
    .from(candidates)
    .where(eq(candidates.projectId, project.id));
  const approvedIds = approved.map((row) => row.id);
  if (!approvedIds.length) return null;
  const [publication] = await database
    .select({
      candidateId: publications.candidateId,
      contentPayload: publications.contentPayload,
      publishedAt: publications.publishedAt,
    })
    .from(publications)
    .where(
      and(eq(publications.status, "published"), inArray(publications.candidateId, approvedIds)),
    )
    .orderBy(desc(publications.publishedAt))
    .limit(1);
  if (!publication) return null;
  return toPublishedProject(publication, project.id, project.name, project.slug);
}

function toPublishedProject(
  publication: { candidateId: string; contentPayload: unknown; publishedAt: Date | null },
  projectId: string,
  name: string,
  slug: string,
): PublishedProject | null {
  const parsed = contentModelSchema.safeParse(publication.contentPayload);
  if (!parsed.success || !publication.publishedAt) return null;
  const content = parsed.data;
  if (content.projectSlug !== slug) return null;
  return {
    projectId,
    name,
    slug,
    candidateId: publication.candidateId,
    content: {
      ...content,
      sources: content.sources.filter((source) => isHttpUrl(source.url)),
    },
    publishedAt: publication.publishedAt,
  };
}
