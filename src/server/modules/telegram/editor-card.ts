import type { ContentModel } from "@/server/modules/content/model";

export type EditorCard = {
  text: string;
  inlineKeyboard: Array<Array<{ text: string; callback_data: string }>>;
};

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export function renderEditorCard(
  content: Pick<
    ContentModel,
    "candidateId" | "title" | "shortSummary" | "score" | "confidence" | "projectUrl"
  >,
): EditorCard {
  const candidateId = content.candidateId;
  const text = `<b>REVIEW</b>\n<b>${escapeHtml(content.title)}</b>\n\n${escapeHtml(content.shortSummary)}\n\nVIBE SCORE: ${content.score.toFixed(1)} · Confidence: ${content.confidence.toFixed(0)}\n<a href="${escapeHtml(content.projectUrl)}">Источник</a>`;
  return {
    text: text.slice(0, 4096),
    inlineKeyboard: [
      [
        { text: "Approve", callback_data: `vr:approve:${candidateId}` },
        { text: "Watch", callback_data: `vr:watch:${candidateId}` },
        { text: "Reject", callback_data: `vr:reject:${candidateId}` },
      ],
    ],
  };
}
