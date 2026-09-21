import { loadEnvironment, parseEditorIds } from "@/server/config/env";
import { applyEditorCallback } from "@/server/modules/editorial/decision";
import {
  parseTelegramEditorUpdate,
  verifyTelegramWebhookSecret,
} from "@/server/modules/telegram/update";
import { createEditorBot } from "@/server/modules/telegram/editor-bot";
import type { RuntimeConfig } from "@/server/config/env";

export async function POST(request: Request) {
  const config = loadEnvironment() as RuntimeConfig;
  if (
    !verifyTelegramWebhookSecret(
      request.headers.get("x-telegram-bot-api-secret-token"),
      config.TELEGRAM_WEBHOOK_SECRET,
    )
  )
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  let update;
  try {
    update = parseTelegramEditorUpdate(body);
  } catch {
    return Response.json({ error: "Invalid update" }, { status: 400 });
  }
  try {
    const result = await applyEditorCallback(
      update.data,
      update.actorId,
      parseEditorIds(config.TELEGRAM_EDITOR_IDS),
    );
    const bot = createEditorBot({
      token: config.TELEGRAM_BOT_TOKEN!,
      editorChatId: config.TELEGRAM_EDITOR_CHAT_ID!,
    });
    await bot.sendReviewCard({
      text: `<b>REVIEW</b>\n<b>${result.status === "APPROVED" ? "Approval" : result.status === "REJECTED" ? "Rejection" : "Watch"}</b>\nCandidate ${result.candidateId}`,
      inlineKeyboard: [
        [
          { text: "Approve", callback_data: `vr:approve:${result.candidateId}` },
          { text: "Watch", callback_data: `vr:watch:${result.candidateId}` },
          { text: "Reject", callback_data: `vr:reject:${result.candidateId}` },
        ],
      ],
    });
    const callbackQueryId = (body as any)?.callback_query?.id;
    if (callbackQueryId) {
      await fetch(
        `https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            callback_query_id: callbackQueryId,
            text: "Decision processed",
          }),
          signal: AbortSignal.timeout(3000),
        },
      ).catch(() => {/* non-blocking */});
    }
    return Response.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Decision failed";
    const status = message === "Unauthorized editor" ? 403 : message.includes("stale") ? 409 : 400;
    return Response.json({ error: status === 403 ? "Forbidden" : "Decision rejected" }, { status });
  }
}