import type { ContentModel } from "@/server/modules/content/model";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function safeLink(value: string): string {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? escapeHtml(url.toString()) : "#";
  } catch {
    return "#";
  }
}

const TELEGRAM_MESSAGE_LIMIT = 4096;

/**
 * Bound rendered output without cutting inside an HTML tag or entity.
 * Backtracks to the last safe boundary when the hard limit falls inside
 * `<...>` or `&...`. Deterministic: identical input yields identical output.
 */
export function boundTelegramMessage(message: string, limit = TELEGRAM_MESSAGE_LIMIT): string {
  if (message.length <= limit) return message;
  let cut = limit;
  const openTag = message.lastIndexOf("<", cut);
  const closeTag = message.lastIndexOf(">", cut);
  if (openTag > closeTag) cut = openTag;
  const openEntity = message.lastIndexOf("&", cut);
  const closeEntity = message.lastIndexOf(";", cut);
  if (openEntity > closeEntity) cut = openEntity;
  return message.slice(0, cut);
}

export function renderTelegramHtml(content: ContentModel): string {
  const points = content.keyPoints
    .slice(0, 5)
    .map((point) => `• ${escapeHtml(point)}`)
    .join("\n");
  const limitations = content.limitations.length
    ? `\n\n<b>Ограничения</b>\n${content.limitations
        .slice(0, 3)
        .map((item) => `• ${escapeHtml(item)}`)
        .join("\n")}`
    : "";
  const message = `<b>${escapeHtml(content.title)}</b>\n\n${escapeHtml(content.shortSummary)}\n\n<b>Почему сейчас</b>\n${escapeHtml(content.whyNow)}\n\n${points}${limitations}\n\nVIBE SCORE: <b>${content.score.toFixed(1)}</b> · Confidence: ${content.confidence.toFixed(0)}\n<a href="${safeLink(content.projectUrl)}">Источник проекта</a>`;
  return boundTelegramMessage(message);
}
