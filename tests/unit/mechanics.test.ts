import { describe, expect, it } from "vitest";
import { assessMechanic } from "@/server/modules/mechanics/assessment";
import { validateMechanicProposal } from "@/server/modules/mechanics/contract";
import { deriveIndependenceGroup } from "@/server/modules/mechanics/evidence";

const PROJECT_A = "00000000-0000-4000-8000-0000000000a1";
const PROJECT_B = "00000000-0000-4000-8000-0000000000b2";

const evidence = (projectId: string, observedAt: string) => ({
  group: deriveIndependenceGroup(projectId),
  observedAt: new Date(observedAt),
  resolved: true,
});

describe("Product Mechanic Radar", () => {
  it("rejects untrusted proposals with unexpected fields", () => {
    expect(() =>
      validateMechanicProposal({
        canonicalName: "Approval checkpoints",
        description: "A repeated approval interaction.",
        evidence: [{ projectId: PROJECT_A }],
        affectedCategories: [],
        practicalImplications: [],
        risks: [],
        execute: "publish",
      }),
    ).toThrow();
  });

  it("rejects caller-controlled independence, stage, and metrics", () => {
    for (const extra of [
      { independenceGroup: "origin-a" },
      { stage: "BREAKOUT" },
      { velocity: 99 },
      { confidence: 99 },
      { public: true },
      { editorId: "editor-1" },
    ]) {
      expect(() =>
        validateMechanicProposal({
          canonicalName: "Approval checkpoints",
          description: "A repeated approval interaction.",
          evidence: [{ projectId: PROJECT_A, ...extra }],
          affectedCategories: [],
          practicalImplications: [],
          risks: [],
        }),
      ).toThrow();
    }
    expect(() =>
      validateMechanicProposal({
        canonicalName: "Approval checkpoints",
        description: "A repeated approval interaction.",
        evidence: [{ projectId: PROJECT_A }],
        affectedCategories: [],
        practicalImplications: [],
        risks: [],
        stage: "BREAKOUT",
      }),
    ).toThrow();
  });

  it("counts server-derived groups instead of duplicate evidence rows", () => {
    const assessment = assessMechanic({
      evidence: [
        evidence(PROJECT_A, "2026-09-10T00:00:00Z"),
        evidence(PROJECT_A, "2026-09-12T00:00:00Z"),
        evidence(PROJECT_B, "2026-09-12T00:00:00Z"),
      ],
      now: new Date("2026-09-18T00:00:00Z"),
    });
    expect(assessment.independentSourceCount).toBe(2);
    expect(assessment.evidenceCount).toBe(3);
    expect(assessment.stage).toBe("SPARK");
  });

  it("promotes only evidence-backed lifecycle stages", () => {
    const groups = ["a", "b", "c", "d", "e"].map((suffix) => ({
      group: `project:00000000-0000-4000-8000-0000000000${suffix}1`,
      observedAt: new Date("2026-09-17T00:00:00Z"),
      resolved: true,
    }));
    const now = new Date("2026-09-18T00:00:00Z");
    expect(assessMechanic({ evidence: groups, now }).stage).toBe("BREAKOUT");
    const quietYoung = groups.map((item) => ({
      ...item,
      observedAt: new Date("2026-07-20T00:00:00Z"),
    }));
    // Broad and quiet but observed for 60 days is not ESTABLISHED: maturity
    // requires a 90-day span, so low velocity alone never promotes.
    expect(assessMechanic({ evidence: quietYoung, now }).stage).toBe("SPARK");
    const mature = groups.map((item) => ({
      ...item,
      observedAt: new Date("2026-01-01T00:00:00Z"),
    }));
    expect(assessMechanic({ evidence: mature, now }).stage).toBe("ESTABLISHED");
  });
});
