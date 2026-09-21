export class TelegramPublishError extends Error {}

type TelegramPublisherOptions = { token: string; timeoutMs?: number; fetcher?: typeof fetch };

export class TelegramPublisher {
  private readonly fetcher: typeof fetch;

  constructor(private readonly options: TelegramPublisherOptions) {
    this.fetcher = options.fetcher ?? fetch;
  }

  async publish(chatId: string, html: string): Promise<{ providerMessageId: string }> {
    const response = await this.fetcher(
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
        signal: AbortSignal.timeout(this.options.timeoutMs ?? 10000),
      },
    );
    if (!response.ok) throw new TelegramPublishError("Telegram publish failed");
    const payload = (await response.json()) as { ok?: boolean; result?: { message_id?: number } };
    if (!payload.ok || !payload.result?.message_id)
      throw new TelegramPublishError("Telegram publish failed");
    return { providerMessageId: String(payload.result.message_id) };
  }
}
