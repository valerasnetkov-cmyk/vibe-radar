import { describe, expect, it } from "vitest";
import { parseEnvironment, requireTelegramEditorConfig } from "@/server/config/env";
import { parseStoredConfidenceAssessment } from "@/server/modules/confidence/stored-confidence";
import { buildEditorCardProjection } from "@/server/modules/editorial/candidate-job";
import { normalizeTelegramError } from "@/server/modules/editorial/dispatch-service";
import { parseStoredScoreBreakdown } from "@/server/modules/scoring/stored-breakdown";
import { TelegramEditorBotError } from "@/server/modules/telegram/editor-bot";

const CANDIDATE_ID = "00000000-0000-4000-8000-000000000002";
const ANALYSIS_OUTPUT = {
  summary: "Fast Rust bundler with <plugin> support",
  why_interesting: "Interesting because it is fast",
  use_cases: ["build"],
  audience: ["developers"],
  limitations: ["young"],
  categories: ["devtools"],
  content_angles: ["speed"],
  outscan_relevance: "NONE" as const,
};

describe("Stage 07 card projection from persisted data", () => {
  it("uses the real project URL and analysis summary with escaping preserved", () => {
    const result = buildEditorCardProjection({
      candidateId: CANDIDATE_ID,
      projectName: "Tool <one>",
      providerUrl: "https://github.com/example/tool-one",
      analysisOutput: ANALYSIS_OUTPUT,
      score: 70,
      confidence: 80,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.card.text).toContain("https://github.com/example/tool-one");
    expect(result.card.text).toContain("Tool &lt;one&gt;");
    expect(result.card.text).toContain("Fast Rust bundler with &lt;plugin&gt; support");
    expect(result.card.text).not.toContain("https://github.com/example/project");
    expect(result.card.text).not.toContain("Review Required");
  });

  it("never fabricates missing values and returns deterministic reasons", () => {
    expect(
      buildEditorCardProjection({
        candidateId: CANDIDATE_ID,
        projectName: "  ",
        providerUrl: "https://github.com/example/x",
        analysisOutput: ANALYSIS_OUTPUT,
        score: 70,
        confidence: 80,
      }),
    ).toEqual({ ok: false, reason: "missing-project-name" });
    expect(
      buildEditorCardProjection({
        candidateId: CANDIDATE_ID,
        projectName: "Tool",
        providerUrl: undefined,
        analysisOutput: ANALYSIS_OUTPUT,
        score: 70,
        confidence: 80,
      }),
    ).toEqual({ ok: false, reason: "missing-provider-url" });
    expect(
      buildEditorCardProjection({
        candidateId: CANDIDATE_ID,
        projectName: "Tool",
        providerUrl: "https://github.com/example/x",
        analysisOutput: null,
        score: 70,
        confidence: 80,
      }),
    ).toEqual({ ok: false, reason: "missing-analysis-output" });
    expect(
      buildEditorCardProjection({
        candidateId: CANDIDATE_ID,
        projectName: "Tool",
        providerUrl: "https://github.com/example/x",
        analysisOutput: { summary: "" },
        score: 70,
        confidence: 80,
      }),
    ).toEqual({ ok: false, reason: "invalid-analysis-output" });
  });
});

describe("Stage 07 persisted score/confidence reconstruction", () => {
  it("parses the canonical nested breakdown and preserves the stored version", () => {
    const score = parseStoredScoreBreakdown(
      {
        components: {
          growth: 10,
          vibeRelevance: 20,
          freshness: 30,
          developmentActivity: 40,
          community: 50,
          documentation: 60,
          originality: 70,
        },
        penalties: { forkOrMirror: 5 },
        beforePenalties: 42,
      },
      3,
      77,
    );
    expect(score.components.vibeRelevance).toBe(20);
    expect(score.components.freshness).toBe(30);
    expect(score.penalties.forkOrMirror).toBe(5);
    expect(score.penalties.prolongedInactivity).toBe(0);
    expect(score.beforePenalties).toBe(42);
    expect(score.scoreVersion).toBe(3);
    expect(score.finalScore).toBe(77);
  });

  it("does not read flat component keys from the wrong level", () => {
    const score = parseStoredScoreBreakdown(
      { components: { growth: 11 }, vibeRelevance: 99 },
      1,
      60,
    );
    expect(score.components.growth).toBe(11);
    expect(score.components.vibeRelevance).toBe(0);
  });

  it("loads real confidence evidence counts instead of manufacturing zeros", () => {
    const assessment = parseStoredConfidenceAssessment({
      value: 82,
      level: "HIGH",
      confidenceVersion: 2,
      explanation: { evidence: 10, sources: 5, history: 4, contradictions: 1 },
      evidenceCount: 7,
      contradictionCount: 2,
    });
    expect(assessment.confidenceVersion).toBe(2);
    expect(assessment.inputs.evidenceCount).toBe(7);
    expect(assessment.inputs.contradictionCount).toBe(2);
    expect(assessment.explanation.evidence).toBe(10);
  });
});

describe("Stage 07 Telegram runtime config", () => {
  it("fails closed only when the editorial path requires it", () => {
    const base = parseEnvironment({ DATABASE_URL: "postgresql://localhost/viberadar" });
    expect(() => requireTelegramEditorConfig(base)).toThrow(
      "Telegram editorial configuration is incomplete",
    );
    const full = parseEnvironment({
      DATABASE_URL: "postgresql://localhost/viberadar",
      TELEGRAM_BOT_TOKEN: "token-1",
      TELEGRAM_EDITOR_CHAT_ID: "-1001",
      TELEGRAM_EDITOR_IDS: "42, 43",
      TELEGRAM_API_TIMEOUT_MS: "7000",
    });
    const telegram = requireTelegramEditorConfig(full);
    expect(telegram.botToken).toBe("token-1");
    expect(telegram.editorChatId).toBe("-1001");
    expect(telegram.editorIds.has("42")).toBe(true);
    expect(telegram.timeoutMs).toBe(7000);
  });
});

describe("Stage 07 dispatch error normalization", () => {
  it("maps provider failures to safe codes without secret-bearing text", () => {
    expect(normalizeTelegramError(new TelegramEditorBotError("TELEGRAM_SEND_TIMEOUT"))).toBe(
      "TELEGRAM_SEND_TIMEOUT",
    );
    expect(normalizeTelegramError(new TypeError("fetch failed"))).toBe("NETWORK_ERROR");
    expect(normalizeTelegramError(new DOMException("x", "AbortError"))).toBe("TIMEOUT");
    const code = normalizeTelegramError(new Error("raw db password=hunter2"));
    expect(code).toBe("PROVIDER_ERROR");
    expect(code).not.toContain("hunter2");
  });
});
