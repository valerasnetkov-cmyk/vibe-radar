export const CHROME_DEVELOPERS_FEED_URL =
  "https://developer.chrome.com/static/blog/feed.xml";

export type ChromeFeedEntry = {
  title: string;
  url: string;
  publishedAt: Date;
  summary: string | null;
};

export type ChromeFeedClientOptions = {
  timeoutMs: number;
  maxBytes?: number;
  fetcher?: typeof fetch;
};

const DEFAULT_MAX_BYTES = 2_000_000;

function decodeXml(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

function stripCdata(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("<![CDATA[") && trimmed.endsWith("]]>")) {
    return trimmed.slice(9, -3);
  }
  return trimmed;
}

function tagValue(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXml(stripCdata(match[1]).trim()) : null;
}

function plainText(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseChromeFeed(xml: string): ChromeFeedEntry[] {
  if (!xml.includes("<rss") && !xml.includes("<feed")) {
    throw new Error("Chrome feed is not RSS/Atom XML");
  }
  const entries: ChromeFeedEntry[] = [];
  const itemPattern = /<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi;
  for (const match of xml.matchAll(itemPattern)) {
    const block = match[1];
    const title = tagValue(block, "title");
    const url = tagValue(block, "link");
    const pubDate = tagValue(block, "pubDate");
    const description = tagValue(block, "description");
    if (!title || !url || !pubDate) continue;

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      continue;
    }
    if (parsedUrl.protocol !== "https:" || parsedUrl.hostname !== "developer.chrome.com") continue;

    const publishedAt = new Date(pubDate);
    if (Number.isNaN(publishedAt.getTime())) continue;
    const summary = description ? plainText(description).slice(0, 4000) || null : null;
    entries.push({
      title: plainText(title).slice(0, 300),
      url: parsedUrl.toString(),
      publishedAt,
      summary,
    });
  }
  return entries;
}

export class ChromeFeedClient {
  private readonly fetcher: typeof fetch;

  constructor(private readonly options: ChromeFeedClientOptions) {
    this.fetcher = options.fetcher ?? fetch;
  }

  async listEntries(): Promise<ChromeFeedEntry[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.options.timeoutMs);
    try {
      const response = await this.fetcher(CHROME_DEVELOPERS_FEED_URL, {
        method: "GET",
        headers: {
          accept: "application/rss+xml, application/xml, text/xml",
          "user-agent": "VibeRadar/0.1 (+https://viberadar.ru)",
        },
        redirect: "error",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Chrome feed HTTP ${response.status}`);
      const contentType = response.headers.get("content-type") ?? "";
      if (!/xml|rss/i.test(contentType)) throw new Error("Chrome feed content type is not XML");
      const text = await response.text();
      if (text.length > (this.options.maxBytes ?? DEFAULT_MAX_BYTES)) {
        throw new Error("Chrome feed exceeds size limit");
      }
      return parseChromeFeed(text);
    } finally {
      clearTimeout(timer);
    }
  }
}
