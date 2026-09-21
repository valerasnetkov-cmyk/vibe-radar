import type { EditorCard } from "./editor-card";
import { TelegramPublishError } from "./publisher";

type EditorBotOptions = {
  token: string;
  editorChatId: string;
  timeoutMs?: number;
  fetcher?: typeof fetch;
};

export class EditorBot {
  private readonly fetcher: typeof fetch;

  constructor(private readonly options: EditorBotOptions) {
    this.fetcher = options.fetcher ?? fetch;
  }

  async sendReviewCard(card: EditorCard): Promise<{ providerMessageId: string }> {
    const timeout = this.options.timeoutMs ?? 30000;
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), timeout);

    try {
      const response = await this.fetcher(
        `https://api.telegram.org/bot${this.options.token}/sendMessage`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            chat_id: this.options.editorChatId,
            text: card.text,
            parse_mode: "HTML",
            disable_web_page_preview: true,
            reply_markup: {
              inline_keyboard: card.inlineKeyboard,
            },
          }),
          signal: abortController.signal,
        },
      );

      clearTimeout(timeoutId);

      if (!response.ok) throw new TelegramPublishError("Editor bot publish failed");

      const body = (await response.text()) as string;
      const parsed = JSON.parse(body);
      if (!parsed.ok || !parsed.result?.message_id)
        throw new TelegramPublishError("Editor bot publish failed");

      return { providerMessageId: String(parsed.result.message_id) };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async answerCallbackQuery(callbackQueryId: string, text: string): Promise<void> {
    const timeout = this.options.timeoutMs ?? 10000;
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), timeout);

    try {
      await this.fetcher(`https://api.telegram.org/bot${this.options.token}/answerCallbackQuery`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text,
        }),
        signal: abortController.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export function createEditorBot(options: Omit<EditorBotOptions, "fetcher">) {
  return new EditorBot(options);
}

export class TelegramEditorBotError extends Error {}
