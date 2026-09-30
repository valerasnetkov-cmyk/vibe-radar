import { describe, expect, it } from "vitest";
import {
  deriveIndependenceGroup,
  UNRESOLVED_GROUP,
} from "../../src/server/modules/mechanics/evidence";

describe("mechanic evidence independence groups", () => {
  it("uses the canonical project as the strongest independence anchor", () => {
    expect(deriveIndependenceGroup("project-1", "chrome")).toEqual({
      group: "project:project-1",
      basis: "project",
    });
  });

  it("groups all Chrome official posts under one publisher origin", () => {
    expect(deriveIndependenceGroup(null, "chrome")).toEqual({
      group: "publisher:chrome",
      basis: "publisher",
    });
  });

  it("does not treat arbitrary source providers as independent implementations", () => {
    expect(deriveIndependenceGroup(null, "github")).toEqual({
      group: UNRESOLVED_GROUP,
      basis: "unresolved",
    });
    expect(deriveIndependenceGroup(null, "unknown")).toEqual({
      group: UNRESOLVED_GROUP,
      basis: "unresolved",
    });
  });
});
