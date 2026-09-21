import type {
  GitHubRelease,
  GitHubRepository,
  GitHubSearchResponse,
} from "@/server/modules/github/contracts";

const API_URL = "https://api.github.com";

export class GitHubClientError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "GitHubClientError";
  }
}

type GitHubClientOptions = {
  token?: string;
  timeoutMs: number;
  maxRetries: number;
  fetcher?: typeof fetch;
};

export class GitHubClient {
  private readonly fetcher: typeof fetch;

  constructor(private readonly options: GitHubClientOptions) {
    this.fetcher = options.fetcher ?? fetch;
  }

  async searchRepositories(query: string, page = 1, perPage = 30): Promise<GitHubSearchResponse> {
    if (!query.trim() || page < 1 || perPage < 1 || perPage > 100) {
      throw new GitHubClientError("Invalid GitHub search parameters", null, false);
    }

    const url = new URL("/search/repositories", API_URL);
    url.searchParams.set("q", query);
    url.searchParams.set("page", String(page));
    url.searchParams.set("per_page", String(perPage));
    return this.request<GitHubSearchResponse>(url);
  }

  async getRepository(owner: string, name: string): Promise<GitHubRepository> {
    return this.request<GitHubRepository>(this.repositoryUrl(owner, name));
  }

  async listReleases(owner: string, name: string, perPage = 30): Promise<GitHubRelease[]> {
    if (perPage < 1 || perPage > 100)
      throw new GitHubClientError("Invalid GitHub release parameters", null, false);
    const url = this.repositoryUrl(owner, name);
    url.pathname += "/releases";
    url.searchParams.set("per_page", String(perPage));
    return this.request<GitHubRelease[]>(url);
  }

  private repositoryUrl(owner: string, name: string): URL {
    if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(name)) {
      throw new GitHubClientError("Invalid GitHub repository identity", null, false);
    }
    return new URL(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`, API_URL);
  }

  private async request<T>(url: URL): Promise<T> {
    for (let attempt = 0; attempt <= this.options.maxRetries; attempt += 1) {
      try {
        const response = await this.fetcher(url, {
          headers: {
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            ...(this.options.token ? { Authorization: `Bearer ${this.options.token}` } : {}),
          },
          signal: AbortSignal.timeout(this.options.timeoutMs),
        });
        if (response.ok) return (await response.json()) as T;
        const retryable =
          response.status === 408 || response.status === 429 || response.status >= 500;
        if (!retryable || attempt === this.options.maxRetries) {
          throw new GitHubClientError("GitHub request failed", response.status, retryable);
        }
        await this.wait(attempt);
      } catch (error) {
        if (error instanceof GitHubClientError) throw error;
        if (attempt === this.options.maxRetries)
          throw new GitHubClientError("GitHub request failed", null, true);
        await this.wait(attempt);
      }
    }
    throw new GitHubClientError("GitHub request failed", null, true);
  }

  private async wait(attempt: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 100 * 2 ** attempt));
  }
}
