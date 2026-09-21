import { loadEnvironment, parseEditorIds } from "@/server/config/env";
import { applyEditorCallback } from "@/server/modules/editorial/decision";
import {
  parseTelegramEditorUpdate,
  verifyTelegramWebhookSecret,
} from "@/server/modules/telegram/update";

export async function POST(request: Request) {
  const config = loadEnvironment();
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
    return Response.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Decision failed";
    const status = message === "Unauthorized editor" ? 403 : message.includes("stale") ? 409 : 400;
    return Response.json({ error: status === 403 ? "Forbidden" : "Decision rejected" }, { status });
  }
}
