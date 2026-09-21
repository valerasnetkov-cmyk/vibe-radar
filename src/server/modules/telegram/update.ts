import { timingSafeEqual } from "node:crypto";
import { z } from "zod";

const updateSchema = z
  .object({
    callback_query: z
      .object({
        id: z.string().min(1).max(200),
        from: z.object({ id: z.union([z.number().int(), z.string().min(1)]) }).passthrough(),
        data: z.string().min(1).max(64),
      })
      .passthrough(),
  })
  .passthrough();

export type TelegramEditorUpdate = { callbackId: string; actorId: string; data: string };

export function parseTelegramEditorUpdate(value: unknown): TelegramEditorUpdate {
  const parsed = updateSchema.parse(value).callback_query;
  return { callbackId: parsed.id, actorId: String(parsed.from.id), data: parsed.data };
}

export function verifyTelegramWebhookSecret(
  received: string | null,
  expected: string | undefined,
): boolean {
  if (!expected) {
    // Development / test fallback: allow without configured secret
    return process.env.NODE_ENV !== "production";
  }
  if (!received) return false;
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}
