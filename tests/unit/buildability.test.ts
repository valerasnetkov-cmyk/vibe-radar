import { describe, expect, it } from "vitest";
import { assessBuildability } from "@/server/modules/buildability/assess";

const low = {
  frontend: 20,
  backend: 30,
  infrastructure: 20,
  externalApis: 10,
  aiDependency: 20,
  authBilling: 10,
  dataRequirements: 20,
  securityCompliance: 20,
  realtimeMobile: 10,
  operations: 20,
};

describe("buildability assessment", () => {
  it("classifies a bounded low-complexity core as SOLO_MVP", () => {
    const assessment = assessBuildability({
      dimensions: low,
      constraints: ["Keep the first release narrow", "Keep the first release narrow"],
    });
    expect(assessment.assessmentVersion).toBe(1);
    expect(assessment.label).toBe("SOLO_MVP");
    expect(assessment.constraints).toEqual(["Keep the first release narrow"]);
  });

  it("classifies a high complexity dimension as TEAM_REQUIRED", () => {
    const assessment = assessBuildability({ dimensions: { ...low, securityCompliance: 95 } });
    expect(assessment.label).toBe("TEAM_REQUIRED");
  });
});
