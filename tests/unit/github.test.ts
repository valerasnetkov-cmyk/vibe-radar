import { describe, expect, it, vi } from "vitest";
import { GitHubClient } from "@/server/modules/github/client";
import { normalizeRepository } from "@/server/modules/github/normalize";

const repository = {
  id: 42,
  name: "radar",
  full_name: "acme/radar",
  owner: { login: "acme" },
  html_url: "https://github.com/acme/radar",
  description: "A repository",
  language: "TypeScript",
  topics: ["ai"],
  stargazers_count: 10,
  forks_count: 2,
  open_issues_count: 1,
  watchers_count: 4,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
  pushed_at: null,
  default_branch: "main",
};

describe("GitHub discovery boundary", () => {
  it("normalizes provider fields into the internal contract", () => {
    const normalized = normalizeRepository(repository);
    expect(normalized).toMatchObject({
      providerObjectId: "42",
      fullName: "acme/radar",
      category: "ai",
    });
    expect(normalized.createdAtProvider).toBeInstanceOf(Date);
  });

  it("uses the fixed GitHub API and retries transient failures", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("busy", { status: 503 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ total_count: 0, incomplete_results: false, items: [] }), {
          status: 200,
        }),
      );
    const client = new GitHubClient({ timeoutMs: 1000, maxRetries: 1, fetcher });
    const result = await client.searchRepositories("topic:ai");
    expect(result.total_count).toBe(0);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(String(fetcher.mock.calls[0]?.[0])).toMatch(
      /^https:\/\/api\.github\.com\/search\/repositories/,
    );
  });

  it("fetches repository releases through the fixed repository route", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            id: 7,
            tag_name: "v1.0.0",
            name: "First",
            body: null,
            published_at: null,
            prerelease: false,
            draft: false,
          },
        ]),
        { status: 200 },
      ),
    );
    const client = new GitHubClient({ timeoutMs: 1000, maxRetries: 0, fetcher });
    const result = await client.listReleases("acme", "radar");
    expect(result[0]?.id).toBe(7);
    expect(String(fetcher.mock.calls[0]?.[0])).toContain(
      "api.github.com/repos/acme/radar/releases",
    );
  });

  it("does not accept arbitrary invalid search parameters", async () => {
    const client = new GitHubClient({ timeoutMs: 1000, maxRetries: 0, fetcher: vi.fn() });
    await expect(client.searchRepositories(" ")).rejects.toThrow(
      "Invalid GitHub search parameters",
    );
  });
});
