import { describe, expect, it, beforeEach } from "vitest";
import { renderEditorCard } from "@/server/modules/telegram/editor-card";
import {
  parseTelegramEditorUpdate,
  verifyTelegramWebhookSecret,
} from "@/server/modules/telegram/update";

const candidateId = "00000000-0000-4000-8000-000000000001";

// beforeEach runs in each describe block; set NODE_ENV from env or default to development
beforeEach(() => {
  // Use process.env directly; TypeScript allows assignment via index signature
  (process.env as Record<string, string | undefined>).NODE_ENV =
    process.env.NODE_ENV || "development";
});

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
    expect(card.text).toContain("Tool <one>");
    expect(card.inlineKeyboard[0]?.map((button) => button.callback_data)).toEqual([
      `vr:approve:${candidateId}`,
      `vr:watch:${candidateId}`,
      `vr:reject:${candidateId}`,
    ]);
  });
});

describe("Telegram webhook security", () => {
  it("development + missing secret → accepted", () => {
    expect(verifyTelegramWebhookSecret("some-secret", undefined)).toBe(true);
  });

  it("production + missing secret → rejected", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    try {
      expect(verifyTelegramWebhookSecret("some-secret", undefined)).toBe(false);
    } finally {
      (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    }
  });

  it("valid secret → accepted", () => {
    expect(verifyTelegramWebhookSecret("secret-value-1234", "secret-value-1234")).toBe(true);
  });

  it("invalid same-length secret → rejected", () => {
    expect(verifyTelegramWebhookSecret("wrong-secret-1", "secret-value-1234")).toBe(false);
  });

  it("invalid different-length secret → rejected without exception", () => {
    const result = verifyTelegramWebhookSecret("ab", "secret-value-1234");
    expect(result).toBe(false);
  });

  it("empty incoming secret → rejected", () => {
    expect(verifyTelegramWebhookSecret("", "secret-value-1234")).toBe(false);
  });
});
