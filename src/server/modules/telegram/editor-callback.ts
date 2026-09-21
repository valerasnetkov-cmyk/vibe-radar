import { z } from "zod";

const callbackSchema = z
  .object({ action: z.enum(["approve", "watch", "reject"]), candidateId: z.string().uuid() })
  .strict();
export type EditorAction = z.infer<typeof callbackSchema>["action"];
export type EditorCallback = z.infer<typeof callbackSchema>;

export function parseEditorCallback(payload: string): EditorCallback {
  const parts = payload.split(":");
  if (parts.length !== 3 || parts[0] !== "vr") throw new Error("Invalid editor callback");
  return callbackSchema.parse({ action: parts[1], candidateId: parts[2] });
}

export function authorizeEditor(actorId: string, allowedEditorIds: ReadonlySet<string>): void {
  if (!allowedEditorIds.has(actorId)) throw new Error("Unauthorized editor");
}
