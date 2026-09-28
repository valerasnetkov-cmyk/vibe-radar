type TelegramPublisherOptions = { token: string; timeoutMs?: number; fetcher?: typeof fetch };

export class TelegramPublishError extends Error {
  readonly code: string;

  constructor(code: string, message?: string) {
    super(message ?? code);
    this.name = "TelegramPublishError";
    this.code = code;
  }
}

function toSafeCode(error: unknown): string {
  if (error instanceof TelegramPublishError) return error.code;
  if (error instanceof DOMException && error.name === "AbortError") {
    return "TELEGRAM_PUBLISH_TIMEOUT";
  }
  if (error instanceof Error && error.name === "AbortError") {
    return "TELEGRAM_PUBLISH_TIMEOUT";
  }
  if (error instanceof TypeError) return "TELEGRAM_PUBLISH_NETWORK";
  return "TELEGRAM_PUBLISH_NETWORK";
}

export class TelegramPublisher {
  private readonly fetcher: typeof fetch;

  constructor(private readonly options: TelegramPublisherOptions) {
    this.fetcher = options.fetcher ?? fetch;
  }

  async publish(chatId: string, html: string): Promise<{ providerMessageId: string }> {
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
              chat_id: chatId,
              text: html,
              parse_mode: "HTML",
              disable_web_page_preview: false,
            }),
            signal: abortController.signal,
          },
        );
      } catch (error) {
        throw new TelegramPublishError(toSafeCode(error));
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        throw new TelegramPublishError(`TELEGRAM_PUBLISH_HTTP_${response.status}`);
      }

      let text: string;
      try {
        text = await response.text();
      } catch {
        throw new TelegramPublishError("TELEGRAM_PUBLISH_NETWORK");
      }
      let payload: { ok?: unknown; result?: unknown };
      try {
        payload = JSON.parse(text) as { ok?: unknown; result?: unknown };
      } catch {
        throw new TelegramPublishError("TELEGRAM_PUBLISH_MALFORMED_JSON");
      }
      if (payload.ok !== true) {
        throw new TelegramPublishError("TELEGRAM_PUBLISH_PROVIDER_REJECTED");
      }
      const messageId =
        typeof payload.result === "object" &&
        payload.result !== null &&
        "message_id" in payload.result
          ? (payload.result as { message_id?: unknown }).message_id
          : undefined;
      if (typeof messageId !== "number" && typeof messageId !== "string") {
        throw new TelegramPublishError("TELEGRAM_PUBLISH_MISSING_MESSAGE_ID");
      }
      return { providerMessageId: String(messageId) };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof TelegramPublishError) throw error;
      throw new TelegramPublishError(toSafeCode(error));
    }
  }
}
