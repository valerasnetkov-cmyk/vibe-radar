import { loadEnvironment } from "@/server/config/env";
import { discoverChromeFeed } from "@/server/modules/discovery/chrome-discovery";

export async function runConfiguredChromeDiscovery(): Promise<void> {
  const config = loadEnvironment();
  await discoverChromeFeed({ timeoutMs: config.CHROME_FEED_TIMEOUT_MS });
}
