import { describe, expect, it } from "vitest";
import { evidenceKeyFor, normalizeMechanicKey } from "@/server/modules/mechanics/identity";

describe("mechanic canonical identity", () => {
  it("normalizes trim, case, and whitespace deterministically", () => {
    expect(normalizeMechanicKey("  Approval   Checkpoints ")).toBe("approval checkpoints");
    expect(normalizeMechanicKey("APPROVAL CHECKPOINTS")).toBe("approval checkpoints");
    expect(normalizeMechanicKey("Approval\tCheckpoints\n")).toBe("approval checkpoints");
    expect(normalizeMechanicKey("Approval checkpoints")).toBe(
      normalizeMechanicKey("  APPROVAL   checkpoints "),
    );
  });

  it("keeps display casing separate from identity", () => {
    expect(normalizeMechanicKey("Human Takeover")).not.toBe("Human Takeover");
    expect(normalizeMechanicKey("Human Takeover")).toBe("human takeover");
  });
});

describe("evidence key stability", () => {
  const base = {
    mechanicId: "00000000-0000-4000-8000-000000000001",
    projectId: "00000000-0000-4000-8000-000000000002",
    sourceEventId: null,
    signalId: "sig-1",
    group: "project:00000000-0000-4000-8000-000000000002",
  };

  it("is stable across retries", () => {
    expect(evidenceKeyFor(base)).toBe(evidenceKeyFor({ ...base }));
    expect(evidenceKeyFor(base)).toMatch(/^[a-f0-9]{64}$/);
  });

  it("changes for genuinely different trusted evidence", () => {
    expect(evidenceKeyFor(base)).not.toBe(
      evidenceKeyFor({ ...base, projectId: "00000000-0000-4000-8000-000000000003" }),
    );
    expect(evidenceKeyFor(base)).not.toBe(evidenceKeyFor({ ...base, signalId: "sig-2" }));
    expect(evidenceKeyFor(base)).not.toBe(
      evidenceKeyFor({ ...base, mechanicId: "00000000-0000-4000-8000-000000000009" }),
    );
  });
});
