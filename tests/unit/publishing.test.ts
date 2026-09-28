import { describe, expect, it, vi } from "vitest";
import { publicationIdempotencyKey } from "@/server/modules/publishing/service";
import { boundTelegramMessage, renderTelegramHtml } from "@/server/modules/telegram/renderer";
import { TelegramPublishError, TelegramPublisher } from "@/server/modules/telegram/publisher";
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
  projectSlug: "tool",
  projectUrl: "https://github.com/acme/tool",
  score: 72.5,
  scoreVersion: 1,
  confidence: 80,
  confidenceLevel: "HIGH",
  sources: [{ label: "acme/tool", url: "https://github.com/acme/tool" }],
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

  it("bounds rendered output without cutting tags or entities", () => {
    const long = renderTelegramHtml({ ...content, shortSummary: "A&".repeat(3000) });
    expect(long.length).toBeLessThanOrEqual(4096);
    expect(long).not.toMatch(/&[^;]*$/);
    expect(long).not.toMatch(/<[^>]*$/);
    expect(boundTelegramMessage("a".repeat(5000), 100).length).toBeLessThanOrEqual(100);
    // A cut after a closed tag is safe and keeps the text.
    expect(boundTelegramMessage(`<b>${"x".repeat(5000)}`, 10)).toBe("<b>xxxxxxx");
    // A cut inside a tag or entity backtracks instead of emitting broken markup.
    expect(boundTelegramMessage('<a href="http://example.com"', 5)).toBe("");
    expect(boundTelegramMessage(`&amp;${"x".repeat(5000)}`, 3)).toBe("");
  });

  it("hides empty limitations and exposes no internal metadata", () => {
    const html = renderTelegramHtml({ ...content, limitations: [] });
    expect(html).not.toContain("Ограничения");
    expect(html).not.toContain("candidate-1");
    expect(html).not.toContain("editor");
    expect(html).not.toContain("test-token");
  });

  it("renders hostile titles as inert text", () => {
    const html = renderTelegramHtml({
      ...content,
      title: '<script>alert("x")</script>',
      shortSummary: 'Quote "me" & go',
    });
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });
});

describe("TelegramPublisher provider boundary", () => {
  const TOKEN = "secret-publisher-token";

  async function expectPublishError(promise: Promise<unknown>): Promise<TelegramPublishError> {
    try {
      await promise;
    } catch (error) {
      expect(error).toBeInstanceOf(TelegramPublishError);
      const publishError = error as TelegramPublishError;
      expect(publishError.message).not.toContain(TOKEN);
      expect(publishError.code).not.toContain(TOKEN);
      return publishError;
    }
    throw new Error("Expected TelegramPublishError");
  }

  it("sends to the configured public channel and returns the provider id", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({ ok: true, result: { message_id: 77 } }, { status: 200 }),
    );
    const publisher = new TelegramPublisher({ token: TOKEN, fetcher });
    const result = await publisher.publish("@public-channel", "<b>Hi</b>");
    expect(result).toEqual({ providerMessageId: "77" });
    const [, init] = fetcher.mock.calls[0]! as unknown as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.chat_id).toBe("@public-channel");
    expect(body.parse_mode).toBe("HTML");
  });

  it("normalizes non-2xx, ok=false, malformed JSON, and missing message_id", async () => {
    const cases: Array<[Response, string]> = [
      [new Response("err", { status: 502 }), "TELEGRAM_PUBLISH_HTTP_502"],
      [Response.json({ ok: false }, { status: 200 }), "TELEGRAM_PUBLISH_PROVIDER_REJECTED"],
      [new Response("{{{", { status: 200 }), "TELEGRAM_PUBLISH_MALFORMED_JSON"],
      [
        Response.json({ ok: true, result: {} }, { status: 200 }),
        "TELEGRAM_PUBLISH_MISSING_MESSAGE_ID",
      ],
    ];
    for (const [response, code] of cases) {
      const fetcher = vi.fn(async () => response);
      const publisher = new TelegramPublisher({ token: TOKEN, fetcher });
      const error = await expectPublishError(publisher.publish("@public-channel", "x"));
      expect(error.code).toBe(code);
    }
  });

  it("normalizes network failure and timeout without leaking the token", async () => {
    const network = vi.fn(async () => {
      throw new TypeError("down");
    });
    const networkError = await expectPublishError(
      new TelegramPublisher({ token: TOKEN, fetcher: network }).publish("@c", "x"),
    );
    expect(networkError.code).toBe("TELEGRAM_PUBLISH_NETWORK");

    const timeout = vi.fn(async () => {
      throw new DOMException("aborted", "AbortError");
    });
    const timeoutError = await expectPublishError(
      new TelegramPublisher({ token: TOKEN, fetcher: timeout }).publish("@c", "x"),
    );
    expect(timeoutError.code).toBe("TELEGRAM_PUBLISH_TIMEOUT");
  });
});
