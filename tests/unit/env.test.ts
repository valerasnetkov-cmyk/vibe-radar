import { describe, expect, it } from "vitest";
import { parseDiscoveryQueries, parseEnvironment } from "@/server/config/env";

const valid = { DATABASE_URL: "postgresql://localhost/viberadar" };

describe("runtime configuration", () => {
  it("requires database configuration without exposing values", () => {
    expect(() => parseEnvironment({})).toThrow("Invalid server configuration");
  });

  it("defaults OUTSCAN flags to closed", () => {
    const config = parseEnvironment(valid);
    expect(config.OUTSCAN_INTEGRATION_ENABLED).toBe(false);
    expect(config.OUTSCAN_NATIVE_CTA_ENABLED).toBe(false);
    expect(config.OUTSCAN_CHECK_ENABLED).toBe(false);
  });

  it("rejects invalid flags safely", () => {
    expect(() => parseEnvironment({ ...valid, OUTSCAN_CHECK_ENABLED: "yes" })).toThrow(
      "Invalid server configuration",
    );
  });

  it("deduplicates and bounds configured discovery queries", () => {
    expect(parseDiscoveryQueries("ai, ai, mcp, agents", 2)).toEqual(["ai", "mcp"]);
  });
});
