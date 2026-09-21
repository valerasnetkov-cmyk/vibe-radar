import { loadEnvironment, parseDiscoveryQueries } from "@/server/config/env";
import { discoverGitHubRepositories } from "@/server/modules/discovery/github-discovery";

export async function runConfiguredGitHubDiscovery(): Promise<void> {
  const config = loadEnvironment();
  const queries = parseDiscoveryQueries(
    config.GITHUB_DISCOVERY_QUERIES,
    config.GITHUB_DISCOVERY_MAX_QUERIES,
  );
  for (const query of queries) await discoverGitHubRepositories(query);
}
