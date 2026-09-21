import type {
  GitHubRelease,
  GitHubRepository,
  NormalizedRelease,
  NormalizedRepository,
} from "@/server/modules/github/contracts";

export function normalizeRepository(repository: GitHubRepository): NormalizedRepository {
  const createdAtProvider = new Date(repository.created_at);
  const updatedAtProvider = new Date(repository.updated_at);
  if (
    !Number.isFinite(createdAtProvider.getTime()) ||
    !Number.isFinite(updatedAtProvider.getTime())
  ) {
    throw new Error("Invalid GitHub repository timestamps");
  }

  return {
    providerObjectId: String(repository.id),
    owner: repository.owner.login,
    name: repository.name,
    fullName: repository.full_name,
    url: repository.html_url,
    description: repository.description,
    category: repository.topics?.[0] ?? repository.language,
    stars: repository.stargazers_count,
    forks: repository.forks_count,
    openIssues: repository.open_issues_count,
    watchers: repository.watchers_count,
    createdAtProvider,
    updatedAtProvider,
    pushedAtProvider: repository.pushed_at ? new Date(repository.pushed_at) : null,
    defaultBranch: repository.default_branch,
  };
}

export function normalizeRelease(release: GitHubRelease): NormalizedRelease {
  const publishedAt = release.published_at ? new Date(release.published_at) : null;
  if (publishedAt && !Number.isFinite(publishedAt.getTime()))
    throw new Error("Invalid GitHub release timestamp");
  return {
    providerReleaseId: String(release.id),
    tagName: release.tag_name,
    name: release.name,
    summary: release.body ? release.body.slice(0, 4000) : null,
    publishedAt,
    isPrerelease: release.prerelease,
    isDraft: release.draft,
  };
}
