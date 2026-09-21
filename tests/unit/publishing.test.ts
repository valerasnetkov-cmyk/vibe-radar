import { describe, expect, it, vi } from "vitest";
import { publicationIdempotencyKey } from "@/server/modules/publishing/service";
import { renderTelegramHtml } from "@/server/modules/telegram/renderer";
import { TelegramPublisher } from "@/server/modules/telegram/publisher";
import type { ContentModel } from "@/server/modules/content/model";

const content: ContentModel = {
  candidateId: "candidate-1",
  contentVersion: "content-v1",
  title: "Tool <one>",
  format: "TRENDING",
  shortSummary: "Useful & bounded",
  whyNow: "Growth is being measured.",
  keyPoints: ["Point one"],
  audience: ["Builders"],
  limitations: ["Small sample"],
  projectUrl: "https://github.com/acme/tool",
  score: 72.5,
  confidence: 80,
  outscanRelevance: "NONE",
};

describe("publishing boundary", () => {
  it("renders escaped compact Telegram HTML and safe links", () => {
    const html = renderTelegramHtml(content);
    expect(html).toContain("Tool &lt;one&gt;");
    expect(html).toContain("Useful &amp; bounded");
    expect(html).toContain("https://github.com/acme/tool");
    expect(renderTelegramHtml({ ...content, projectUrl: "javascript:alert(1)" })).toContain(
      'href="#"',
    );
  });

  it("uses stable idempotency keys", () => {
    expect(publicationIdempotencyKey(content, "telegram")).toBe(
      publicationIdempotencyKey(content, "telegram"),
    );
    expect(publicationIdempotencyKey(content, "telegram")).not.toBe(
      publicationIdempotencyKey(content, "web"),
    );
  });

  it("publishes only a Telegram API request and validates response", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true, result: { message_id: 12 } }), { status: 200 }),
      );
    const publisher = new TelegramPublisher({ token: "test-token", fetcher });
    await expect(publisher.publish("@channel", "<b>Test</b>")).resolves.toEqual({
      providerMessageId: "12",
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[1]?.method).toBe("POST");
  });
});
