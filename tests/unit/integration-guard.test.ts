import { afterEach, describe, expect, it, vi } from "vitest";
import { getSafeIntegrationDatabaseUrl } from "../integration/guard";

describe("integration database safety guard", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns null when no database is configured", () => {
    vi.stubEnv("DATABASE_URL", "");
    expect(getSafeIntegrationDatabaseUrl()).toBeNull();
  });

  it("allows identifiably local test databases", () => {
    for (const url of [
      "postgresql://viberadar:local@localhost:5432/viberadar_gate",
      "postgresql://viberadar:local@127.0.0.1:5432/viberadar_gate",
      "postgresql://viberadar:local@postgres:5432/viberadar",
    ]) {
      vi.stubEnv("DATABASE_URL", url);
      vi.stubEnv("NODE_ENV", "test");
      expect(getSafeIntegrationDatabaseUrl()).toBe(url);
    }
  });

  it("refuses production mode and non-local hosts", () => {
    vi.stubEnv("DATABASE_URL", "postgresql://viberadar:local@localhost:5432/viberadar_gate");
    vi.stubEnv("NODE_ENV", "production");
    expect(() => getSafeIntegrationDatabaseUrl()).toThrow("NODE_ENV=production");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@db.example.com:5432/viberadar");
    expect(() => getSafeIntegrationDatabaseUrl()).toThrow("non-local database host");
    vi.stubEnv("DATABASE_URL", "not-a-url");
    expect(() => getSafeIntegrationDatabaseUrl()).toThrow("not a valid URL");
  });
});
