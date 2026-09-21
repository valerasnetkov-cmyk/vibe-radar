import { describe, expect, it } from "vitest";
import { assessMechanic, validateMechanicProposal } from "@/server/modules/mechanics/contract";

const evidence = (group: string) => ({ independenceGroup: group, strength: 70 });

describe("Product Mechanic Radar", () => {
  it("rejects untrusted proposals with unexpected fields", () => {
    expect(() =>
      validateMechanicProposal({
        canonicalName: "Approval checkpoints",
        description: "A repeated approval interaction.",
        evidence: [evidence("a")],
        affectedCategories: [],
        practicalImplications: [],
        risks: [],
        execute: "publish",
      }),
    ).toThrow();
  });

  it("counts independent groups instead of duplicate evidence rows", () => {
    const proposal = validateMechanicProposal({
      canonicalName: "Approval checkpoints",
      description: "A repeated approval interaction.",
      evidence: [evidence("origin-a"), evidence("origin-a"), evidence("origin-b")],
      affectedCategories: ["agents"],
      practicalImplications: ["Add explicit human control"],
      risks: ["May slow automation"],
    });
    const assessment = assessMechanic(proposal, 45);
    expect(assessment.independentSourceCount).toBe(2);
    expect(assessment.stage).toBe("SPARK");
    expect(assessment.confidence).toBe(46);
  });

  it("promotes only evidence-backed lifecycle stages", () => {
    const proposal = validateMechanicProposal({
      canonicalName: "Agent handoff",
      description: "A repeated handoff interaction between agent and person.",
      evidence: [evidence("a"), evidence("b"), evidence("c"), evidence("d"), evidence("e")],
      affectedCategories: [],
      practicalImplications: [],
      risks: [],
    });
    expect(assessMechanic(proposal, 80).stage).toBe("BREAKOUT");
    expect(assessMechanic(proposal, 10).stage).toBe("ESTABLISHED");
  });
});
