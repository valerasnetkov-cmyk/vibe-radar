import type { EditorCard } from "./editor-card";

type EditorBotOptions = {
  token: string;
  editorChatId: string;
  timeoutMs?: number;
  fetcher?: typeof fetch;
};

export class TelegramEditorBotError extends Error {
  readonly code: string;

  constructor(code: string, message?: string) {
    super(message ?? code);
    this.name = "TelegramEditorBotError";
    this.code = code;
  }
}

function toSafeCode(error: unknown, fallback: string): string {
  if (error instanceof TelegramEditorBotError) return error.code;
  if (error instanceof DOMException && error.name === "AbortError") {
    return fallback === "CALLBACK" ? "TELEGRAM_CALLBACK_TIMEOUT" : "TELEGRAM_SEND_TIMEOUT";
  }
  if (error instanceof Error && error.name === "AbortError") {
    return fallback === "CALLBACK" ? "TELEGRAM_CALLBACK_TIMEOUT" : "TELEGRAM_SEND_TIMEOUT";
  }
  if (error instanceof TypeError) {
    return fallback === "CALLBACK" ? "TELEGRAM_CALLBACK_NETWORK" : "TELEGRAM_SEND_NETWORK";
  }
  return fallback === "CALLBACK" ? "TELEGRAM_CALLBACK_NETWORK" : "TELEGRAM_SEND_NETWORK";
}

async function readJsonSafely(
  response: Response,
  kind: "SEND" | "CALLBACK",
): Promise<{ ok?: unknown; result?: unknown }> {
  let text: string;
  try {
    text = await response.text();
  } catch {
    throw new TelegramEditorBotError(
      kind === "SEND" ? "TELEGRAM_SEND_NETWORK" : "TELEGRAM_CALLBACK_NETWORK",
    );
  }
  try {
    return JSON.parse(text) as { ok?: unknown; result?: unknown };
  } catch {
    throw new TelegramEditorBotError(
      kind === "SEND" ? "TELEGRAM_SEND_MALFORMED_JSON" : "TELEGRAM_CALLBACK_MALFORMED_JSON",
    );
  }
}

export class EditorBot {
  private readonly fetcher: typeof fetch;

  constructor(private readonly options: EditorBotOptions) {
    this.fetcher = options.fetcher ?? fetch;
  }

  async sendReviewCard(card: EditorCard): Promise<{ providerMessageId: string }> {
    const timeoutMs = this.options.timeoutMs ?? 10000;
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

    try {
      let response: Response;
      try {
        response = await this.fetcher(
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
      } catch (error) {
        throw new TelegramEditorBotError(toSafeCode(error, "SEND"));
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        throw new TelegramEditorBotError(`TELEGRAM_SEND_HTTP_${response.status}`);
      }

      const parsed = await readJsonSafely(response, "SEND");
      if (parsed.ok !== true) {
        throw new TelegramEditorBotError("TELEGRAM_SEND_PROVIDER_REJECTED");
      }
      const messageId =
        typeof parsed.result === "object" && parsed.result !== null && "message_id" in parsed.result
          ? (parsed.result as { message_id?: unknown }).message_id
          : undefined;
      if (typeof messageId !== "number" && typeof messageId !== "string") {
        throw new TelegramEditorBotError("TELEGRAM_SEND_MISSING_MESSAGE_ID");
      }
      return { providerMessageId: String(messageId) };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof TelegramEditorBotError) throw error;
      throw new TelegramEditorBotError(toSafeCode(error, "SEND"));
    }
  }

  async answerCallbackQuery(callbackQueryId: string, text: string): Promise<void> {
    const timeoutMs = this.options.timeoutMs ?? 10000;
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

    try {
      let response: Response;
      try {
        response = await this.fetcher(
          `https://api.telegram.org/bot${this.options.token}/answerCallbackQuery`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              callback_query_id: callbackQueryId,
              text,
            }),
            signal: abortController.signal,
          },
        );
      } catch (error) {
        throw new TelegramEditorBotError(toSafeCode(error, "CALLBACK"));
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        throw new TelegramEditorBotError(`TELEGRAM_CALLBACK_HTTP_${response.status}`);
      }

      const parsed = await readJsonSafely(response, "CALLBACK");
      if (parsed.ok !== true) {
        throw new TelegramEditorBotError("TELEGRAM_CALLBACK_PROVIDER_REJECTED");
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof TelegramEditorBotError) throw error;
      throw new TelegramEditorBotError(toSafeCode(error, "CALLBACK"));
    }
  }
}

export function createEditorBot(options: Omit<EditorBotOptions, "fetcher">) {
  return new EditorBot(options);
}
