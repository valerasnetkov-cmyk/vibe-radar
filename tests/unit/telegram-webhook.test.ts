import { describe, expect, it } from "vitest";
import { renderEditorCard } from "@/server/modules/telegram/editor-card";
import {
  parseTelegramEditorUpdate,
  verifyTelegramWebhookSecret,
} from "@/server/modules/telegram/update";

const candidateId = "00000000-0000-4000-8000-000000000001";

describe("Telegram webhook boundary", () => {
  it("requires the configured secret and parses callback identity", () => {
    expect(verifyTelegramWebhookSecret("secret-value-1234", "secret-value-1234")).toBe(true);
    expect(verifyTelegramWebhookSecret("wrong", "secret-value-1234")).toBe(false);
    expect(
      parseTelegramEditorUpdate({
        update_id: 1,
        callback_query: {
          id: "callback",
          from: { id: 42, username: "editor" },
          data: `vr:approve:${candidateId}`,
        },
      }),
    ).toEqual({ callbackId: "callback", actorId: "42", data: `vr:approve:${candidateId}` });
  });

  it("rejects malformed updates and renders strict review actions", () => {
    expect(() =>
      parseTelegramEditorUpdate({ callback_query: { id: "x", from: { id: 1 }, data: "too-long" } }),
    ).not.toThrow();
    expect(() => parseTelegramEditorUpdate({ message: { text: "not a callback" } })).toThrow();
    const card = renderEditorCard({
      candidateId,
      title: "Tool <one>",
      shortSummary: "Summary & facts",
      score: 70,
      confidence: 80,
      projectUrl: "https://github.com/example/tool",
    });
    expect(card.text).toContain("Tool &lt;one&gt;");
    expect(card.inlineKeyboard[0]?.map((button) => button.callback_data)).toEqual([
      `vr:approve:${candidateId}`,
      `vr:watch:${candidateId}`,
      `vr:reject:${candidateId}`,
    ]);
  });
});
