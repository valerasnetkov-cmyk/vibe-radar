import { describe, expect, it, vi } from "vitest";
import { EditorBot, TelegramEditorBotError } from "@/server/modules/telegram/editor-bot";

const TOKEN = "secret-bot-token-abc123";
const CHAT_ID = "-100999888777";
const CARD = {
  text: "<b>REVIEW</b>",
  inlineKeyboard: [[{ text: "Approve", callback_data: "vr:approve:1" }]],
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function expectBotError(promise: Promise<unknown>): Promise<TelegramEditorBotError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(TelegramEditorBotError);
    const botError = error as TelegramEditorBotError;
    expect(botError.message).not.toContain(TOKEN);
    expect(botError.code).not.toContain(TOKEN);
    return botError;
  }
  throw new Error("Expected TelegramEditorBotError");
}

describe("EditorBot.sendReviewCard", () => {
  it("uses the editor chat id, HTML parse mode, inline keyboard, and returns provider id", async () => {
    const fetcher = vi.fn(async () => jsonResponse({ ok: true, result: { message_id: 42 } }));
    const bot = new EditorBot({ token: TOKEN, editorChatId: CHAT_ID, timeoutMs: 5000, fetcher });
    const result = await bot.sendReviewCard(CARD);
    expect(result).toEqual({ providerMessageId: "42" });
    expect(fetcher).toHaveBeenCalledOnce();
    const [, init] = fetcher.mock.calls[0]! as unknown as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.chat_id).toBe(CHAT_ID);
    expect(body.parse_mode).toBe("HTML");
    expect(body.reply_markup).toEqual({ inline_keyboard: CARD.inlineKeyboard });
  });

  it("normalizes non-2xx responses", async () => {
    const fetcher = vi.fn(async () => new Response("boom", { status: 500 }));
    const bot = new EditorBot({ token: TOKEN, editorChatId: CHAT_ID, fetcher });
    const error = await expectBotError(bot.sendReviewCard(CARD));
    expect(error.code).toBe("TELEGRAM_SEND_HTTP_500");
  });

  it("normalizes Telegram ok=false", async () => {
    const fetcher = vi.fn(async () => jsonResponse({ ok: false }));
    const bot = new EditorBot({ token: TOKEN, editorChatId: CHAT_ID, fetcher });
    const error = await expectBotError(bot.sendReviewCard(CARD));
    expect(error.code).toBe("TELEGRAM_SEND_PROVIDER_REJECTED");
  });

  it("normalizes malformed JSON", async () => {
    const fetcher = vi.fn(async () => new Response("not-json{", { status: 200 }));
    const bot = new EditorBot({ token: TOKEN, editorChatId: CHAT_ID, fetcher });
    const error = await expectBotError(bot.sendReviewCard(CARD));
    expect(error.code).toBe("TELEGRAM_SEND_MALFORMED_JSON");
  });

  it("normalizes missing message_id", async () => {
    const fetcher = vi.fn(async () => jsonResponse({ ok: true, result: {} }));
    const bot = new EditorBot({ token: TOKEN, editorChatId: CHAT_ID, fetcher });
    const error = await expectBotError(bot.sendReviewCard(CARD));
    expect(error.code).toBe("TELEGRAM_SEND_MISSING_MESSAGE_ID");
  });

  it("normalizes network failure without leaking the token", async () => {
    const fetcher = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    const bot = new EditorBot({ token: TOKEN, editorChatId: CHAT_ID, fetcher });
    const error = await expectBotError(bot.sendReviewCard(CARD));
    expect(error.code).toBe("TELEGRAM_SEND_NETWORK");
  });

  it("normalizes timeout aborts", async () => {
    const fetcher = vi.fn(async () => {
      throw new DOMException("aborted", "AbortError");
    });
    const bot = new EditorBot({ token: TOKEN, editorChatId: CHAT_ID, fetcher });
    const error = await expectBotError(bot.sendReviewCard(CARD));
    expect(error.code).toBe("TELEGRAM_SEND_TIMEOUT");
  });
});

describe("EditorBot.answerCallbackQuery", () => {
  it("sends the correct callback_query_id and accepts ok:true", async () => {
    const fetcher = vi.fn(async () => jsonResponse({ ok: true, result: true }));
    const bot = new EditorBot({ token: TOKEN, editorChatId: CHAT_ID, fetcher });
    await bot.answerCallbackQuery("callback-1", "Decision processed");
    const [, init] = fetcher.mock.calls[0]! as unknown as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.callback_query_id).toBe("callback-1");
  });

  it("normalizes non-2xx callback responses", async () => {
    const fetcher = vi.fn(async () => new Response("err", { status: 429 }));
    const bot = new EditorBot({ token: TOKEN, editorChatId: CHAT_ID, fetcher });
    const error = await expectBotError(bot.answerCallbackQuery("callback-1", "hi"));
    expect(error.code).toBe("TELEGRAM_CALLBACK_HTTP_429");
  });

  it("normalizes malformed callback JSON", async () => {
    const fetcher = vi.fn(async () => new Response("{{{", { status: 200 }));
    const bot = new EditorBot({ token: TOKEN, editorChatId: CHAT_ID, fetcher });
    const error = await expectBotError(bot.answerCallbackQuery("callback-1", "hi"));
    expect(error.code).toBe("TELEGRAM_CALLBACK_MALFORMED_JSON");
  });

  it("normalizes callback ok=false", async () => {
    const fetcher = vi.fn(async () => jsonResponse({ ok: false }));
    const bot = new EditorBot({ token: TOKEN, editorChatId: CHAT_ID, fetcher });
    const error = await expectBotError(bot.answerCallbackQuery("callback-1", "hi"));
    expect(error.code).toBe("TELEGRAM_CALLBACK_PROVIDER_REJECTED");
  });

  it("normalizes callback network failure without leaking the token", async () => {
    const fetcher = vi.fn(async () => {
      throw new TypeError("down");
    });
    const bot = new EditorBot({ token: TOKEN, editorChatId: CHAT_ID, fetcher });
    const error = await expectBotError(bot.answerCallbackQuery("callback-1", "hi"));
    expect(error.code).toBe("TELEGRAM_CALLBACK_NETWORK");
    expect(error.message).not.toContain(TOKEN);
  });
});
