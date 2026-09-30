import { describe, expect, it, vi } from "vitest";
import {
  CHROME_DEVELOPERS_FEED_URL,
  ChromeFeedClient,
  parseChromeFeed,
} from "../../src/server/modules/chrome/feed";

const fixture = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <item>
    <title>New &amp; useful web capability</title>
    <link>https://developer.chrome.com/blog/example</link>
    <pubDate>Tue, 29 Sep 2026 12:00:00 GMT</pubDate>
    <description><![CDATA[<p>Useful <b>browser</b> feature.</p>]]></description>
  </item>
</channel>
</rss>`;

describe("Chrome Developers feed", () => {
  it("parses official RSS entries into bounded plain metadata", () => {
    expect(parseChromeFeed(fixture)).toEqual([
      {
        title: "New & useful web capability",
        url: "https://developer.chrome.com/blog/example",
        publishedAt: new Date("2026-09-29T12:00:00.000Z"),
        summary: "Useful browser feature.",
      },
    ]);
  });

  it("drops links outside the official Chrome Developers host", () => {
    const poisoned = fixture.replace(
      "https://developer.chrome.com/blog/example",
      "https://attacker.example/post",
    );
    expect(parseChromeFeed(poisoned)).toEqual([]);
  });

  it("fetches only the fixed official feed URL", async () => {
    const fetcher = vi.fn(async () =>
      new Response(fixture, {
        status: 200,
        headers: { "content-type": "application/rss+xml; charset=utf-8" },
      }),
    );
    const client = new ChromeFeedClient({ timeoutMs: 1000, fetcher });
    await expect(client.listEntries()).resolves.toHaveLength(1);
    expect(fetcher).toHaveBeenCalledWith(
      CHROME_DEVELOPERS_FEED_URL,
      expect.objectContaining({ method: "GET", redirect: "error" }),
    );
  });

  it("rejects non-XML provider responses", async () => {
    const client = new ChromeFeedClient({
      timeoutMs: 1000,
      fetcher: vi.fn(async () =>
        new Response("<html>login</html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        }),
      ),
    });
    await expect(client.listEntries()).rejects.toThrow("content type");
  });
});
