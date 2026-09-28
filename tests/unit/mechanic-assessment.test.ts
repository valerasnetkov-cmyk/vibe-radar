import { describe, expect, it } from "vitest";
import { assessMechanic, maxStage } from "@/server/modules/mechanics/assessment";
import { MECHANIC_POLICY_VERSION } from "@/server/modules/mechanics/contract";

const NOW = new Date("2026-09-18T00:00:00Z");
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

function groupEvidence(group: string, dates: string[], resolved = true) {
  return dates.map((date) => ({ group, observedAt: day(date), resolved }));
}

describe("mechanic velocity v1", () => {
  it("scores zero for stale-only evidence", () => {
    const assessment = assessMechanic({
      evidence: groupEvidence("project:a", ["2026-01-05", "2026-02-05"]),
      now: NOW,
    });
    expect(assessment.velocity).toBe(0);
  });

  it("rewards recent new groups and ignores duplicates", () => {
    const single = assessMechanic({
      evidence: groupEvidence("project:a", ["2026-09-17"]),
      now: NOW,
    });
    const duplicated = assessMechanic({
      evidence: groupEvidence("project:a", ["2026-09-17", "2026-09-17", "2026-09-17"]),
      now: NOW,
    });
    expect(duplicated.velocity).toBe(single.velocity);
    const expanded = assessMechanic({
      evidence: [
        ...groupEvidence("project:a", ["2026-09-17"]),
        ...groupEvidence("project:b", ["2026-09-17"]),
        ...groupEvidence("project:c", ["2026-09-17"]),
      ],
      now: NOW,
    });
    expect(expanded.velocity).toBeGreaterThan(single.velocity);
  });

  it("stays bounded", () => {
    const groups = Array.from({ length: 20 }, (_, index) => ({
      group: `project:g${index}`,
      observedAt: day("2026-09-17"),
      resolved: true,
    }));
    const assessment = assessMechanic({ evidence: groups, now: NOW });
    expect(assessment.velocity).toBeLessThanOrEqual(100);
    expect(assessment.velocity).toBeGreaterThanOrEqual(0);
  });
});

describe("mechanic confidence v1", () => {
  it("grows with independent trusted groups, not duplicate rows", () => {
    const one = assessMechanic({ evidence: groupEvidence("project:a", ["2026-09-17"]), now: NOW });
    const oneDuplicated = assessMechanic({
      evidence: groupEvidence("project:a", ["2026-09-17", "2026-09-16", "2026-09-15"]),
      now: NOW,
    });
    const two = assessMechanic({
      evidence: [
        ...groupEvidence("project:a", ["2026-09-17"]),
        ...groupEvidence("project:b", ["2026-09-17"]),
      ],
      now: NOW,
    });
    expect(oneDuplicated.confidence).toBeLessThanOrEqual(one.confidence + 15);
    expect(two.confidence).toBeGreaterThan(one.confidence);
    expect(two.confidence).toBeLessThanOrEqual(100);
  });

  it("penalizes unresolved evidence instead of counting it", () => {
    const clean = assessMechanic({
      evidence: groupEvidence("project:a", ["2026-09-17"]),
      now: NOW,
    });
    const noisy = assessMechanic({
      evidence: [
        ...groupEvidence("project:a", ["2026-09-17"]),
        { group: "unresolved", observedAt: day("2026-09-17"), resolved: false },
        { group: "unresolved", observedAt: day("2026-09-17"), resolved: false },
      ],
      now: NOW,
    });
    expect(noisy.independentSourceCount).toBe(clean.independentSourceCount);
    expect(noisy.confidence).toBeLessThan(clean.confidence);
  });
});

describe("mechanic lifecycle v1", () => {
  it("starts at SPARK and requires expansion for RISING", () => {
    expect(assessMechanic({ evidence: [], now: NOW }).stage).toBe("SPARK");
    const twoRecent = assessMechanic({
      evidence: [
        ...groupEvidence("project:a", ["2026-09-17"]),
        ...groupEvidence("project:b", ["2026-09-17"]),
      ],
      now: NOW,
    });
    expect(twoRecent.stage).toBe("SPARK");
    const threeExpanding = assessMechanic({
      evidence: [
        ...groupEvidence("project:a", ["2026-09-17"]),
        ...groupEvidence("project:b", ["2026-09-16"]),
        ...groupEvidence("project:c", ["2026-08-01"]),
      ],
      now: NOW,
    });
    expect(threeExpanding.stage).toBe("RISING");
  });

  it("requires maturity for ESTABLISHED and stamps the policy version", () => {
    const groups = ["a", "b", "c", "d", "e", "f"].flatMap((suffix) =>
      groupEvidence(`project:${suffix}`, ["2026-09-17"]),
    );
    const young = assessMechanic({ evidence: groups, now: NOW });
    expect(young.stage).toBe("BREAKOUT");
    expect(young.policyVersion).toBe(MECHANIC_POLICY_VERSION);
    const mature = assessMechanic({
      evidence: ["a", "b", "c", "d", "e", "f"].flatMap((suffix) =>
        groupEvidence(`project:${suffix}`, ["2026-01-10"]),
      ),
      now: NOW,
    });
    expect(mature.stage).toBe("ESTABLISHED");
  });

  it("never regresses silently through the monotonic guard", () => {
    expect(maxStage("BREAKOUT", "SPARK")).toBe("BREAKOUT");
    expect(maxStage("SPARK", "RISING")).toBe("RISING");
    expect(maxStage("ESTABLISHED", "ESTABLISHED")).toBe("ESTABLISHED");
  });

  it("ignores model-selectable lifecycle completely", () => {
    const assessment = assessMechanic({
      evidence: groupEvidence("project:a", ["2026-09-17"]),
      now: NOW,
    });
    expect(assessment.stage).toBe("SPARK");
    expect(assessment.policyVersion).toBe(1);
  });
});
