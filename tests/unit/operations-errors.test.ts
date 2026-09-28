import { describe, expect, it } from "vitest";
import { normalizeOperationalError } from "@/server/modules/operations/errors";
import { assertKnownJobName, isKnownJobName } from "@/server/modules/operations/registry";
import { TelegramPublishError } from "@/server/modules/telegram/publisher";

describe("operational error normalization", () => {
  it("preserves provider safe codes and classifies retryability", () => {
    expect(normalizeOperationalError(new TelegramPublishError("TELEGRAM_SEND_TIMEOUT"))).toEqual({
      code: "TELEGRAM_SEND_TIMEOUT",
      retryable: true,
    });
    expect(
      normalizeOperationalError(new TelegramPublishError("TELEGRAM_PUBLISH_HTTP_500")),
    ).toEqual({ code: "TELEGRAM_PUBLISH_HTTP_500", retryable: true });
    expect(normalizeOperationalError({ code: "AI_BUDGET_EXHAUSTED" })).toEqual({
      code: "AI_BUDGET_EXHAUSTED",
      retryable: false,
    });
  });

  it("maps typed analysis failures without raw payloads", () => {
    const exhausted = { name: "AnalysisFailedError", reason: "BUDGET_EXHAUSTED" };
    expect(normalizeOperationalError(exhausted)).toEqual({
      code: "AI_BUDGET_EXHAUSTED",
      retryable: false,
    });
    expect(normalizeOperationalError({ name: "AnalysisFailedError", reason: "TIMEOUT" })).toEqual({
      code: "AI_TIMEOUT",
      retryable: true,
    });
    expect(
      normalizeOperationalError({ name: "AnalysisFailedError", reason: "INVALID_OUTPUT" }),
    ).toEqual({ code: "AI_INVALID_OUTPUT", retryable: false });
  });

  it("treats validation and state conflicts as non-retryable", () => {
    expect(normalizeOperationalError({ name: "ZodError", issues: [] })).toEqual({
      code: "JOB_VALIDATION_ERROR",
      retryable: false,
    });
    expect(normalizeOperationalError(new Error("Invalid server configuration"))).toEqual({
      code: "CONFIG_INVALID",
      retryable: false,
    });
    expect(normalizeOperationalError(new Error("Candidate is not approved"))).toEqual({
      code: "JOB_STATE_CONFLICT",
      retryable: false,
    });
  });

  it("retries transient and unknown failures within the bound", () => {
    expect(normalizeOperationalError(new TypeError("fetch failed"))).toEqual({
      code: "JOB_TRANSIENT",
      retryable: true,
    });
    expect(normalizeOperationalError(new DOMException("x", "AbortError"))).toEqual({
      code: "JOB_TIMEOUT",
      retryable: true,
    });
    expect(normalizeOperationalError(new Error("weird"))).toEqual({
      code: "JOB_HANDLER_ERROR",
      retryable: true,
    });
  });

  it("never persists secret-bearing raw messages", () => {
    const secret = "ghp_supersecret123";
    const password = "hunter2";
    for (const error of [
      new Error(`token ${secret} leaked?`),
      new TypeError(`db password=${password}`),
      `DATABASE_URL=postgresql://user:${password}@host/db`,
    ]) {
      const normalized = normalizeOperationalError(error);
      expect(normalized.code).toMatch(/^[A-Z][A-Z0-9_]{1,64}$/);
      expect(normalized.code).not.toContain(secret);
      expect(normalized.code).not.toContain(password);
      expect(normalized.code).not.toContain("DATABASE_URL");
    }
  });
});

describe("job registry allow-list", () => {
  it("accepts every known job and rejects arbitrary module paths and commands", () => {
    for (const name of [
      "github-discovery",
      "score-calculation",
      "candidate-selection",
      "publication",
      "daily-radar",
      "weekly-radar",
    ]) {
      expect(isKnownJobName(name)).toBe(true);
      expect(assertKnownJobName(name)).toBe(name);
    }
    for (const hostile of [
      "rm -rf /",
      "../../../etc/passwd",
      "@/worker/jobs/evil",
      "node -e malicious",
      "publication; DROP TABLE job_runs",
      "",
    ]) {
      expect(isKnownJobName(hostile)).toBe(false);
      expect(() => assertKnownJobName(hostile)).toThrow("Unknown job");
    }
  });
});
