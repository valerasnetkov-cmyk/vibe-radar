import { describe, expect, it } from "vitest";
import { authorizeEditor, parseEditorCallback } from "@/server/modules/telegram/editor-callback";

const candidateId = "00000000-0000-4000-8000-000000000001";

describe("editorial callback boundary", () => {
  it("parses only strict versioned callback payloads", () => {
    expect(parseEditorCallback(`vr:approve:${candidateId}`)).toEqual({
      action: "approve",
      candidateId,
    });
    expect(() => parseEditorCallback(`vr:approve:${candidateId}:extra`)).toThrow();
    expect(() => parseEditorCallback("candidate:approve:not-a-uuid")).toThrow();
  });

  it("requires an explicitly allowed editor identity", () => {
    expect(() => authorizeEditor("editor-1", new Set(["editor-1"]))).not.toThrow();
    expect(() => authorizeEditor("editor-2", new Set(["editor-1"]))).toThrow("Unauthorized editor");
  });
});
