export type GitHubRepository = {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
  html_url: string;
  description: string | null;
  language: string | null;
  topics?: string[];
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  watchers_count: number;
  created_at: string;
  updated_at: string;
  pushed_at: string | null;
  default_branch: string;
};

export type GitHubSearchResponse = {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubRepository[];
};

export type GitHubRelease = {
  id: number;
  tag_name: string;
  name: string | null;
  body: string | null;
  published_at: string | null;
  prerelease: boolean;
  draft: boolean;
};

export type NormalizedRepository = {
  providerObjectId: string;
  owner: string;
  name: string;
  fullName: string;
  url: string;
  description: string | null;
  category: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  watchers: number;
  createdAtProvider: Date;
  updatedAtProvider: Date;
  pushedAtProvider: Date | null;
  defaultBranch: string;
};

export type NormalizedRelease = {
  providerReleaseId: string;
  tagName: string;
  name: string | null;
  summary: string | null;
  publishedAt: Date | null;
  isPrerelease: boolean;
  isDraft: boolean;
};
