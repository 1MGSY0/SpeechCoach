import OpenAI from "openai";
import { INNGEST_LLM_MODEL } from "./llm";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import {
  emptySemanticMemory,
  parseSemanticMemory,
  type SemanticMemory,
} from "@/lib/semantic-memory";
import { TURN_REF_CORRECTION_SYSTEM_PROMPT } from "./prompt";

export type TranscriptTurn = {
  speaker: string;
  text: string;
  timestamp: string;
};

export type TurnRef = {
  text: string;
  timestamp: string;
};

export type CriterionGradingResult = {
  categoryId: string;
  criterionId: string;
  count?: number;
  score?: number;
  maxScore?: number;
  feedback?: string;
  evidence?: string[];
};

export type CoreGradingResult = {
  summary: string;
  overallScore?: number;
  recommendations?: string[];
  results: CriterionGradingResult[];
};

export type TurnRefCorrectionResult = {
  results: Array<{
    categoryId: string;
    criterionId: string;
    turnRefs?: TurnRef[];
  }>;
};

function isConversationProgressValidationError(error: unknown) {
  return (
    error instanceof Error &&
    (error.message.includes("extra field `processingProgress`") ||
      error.message.includes("extra field `processingError`"))
  );
}

export async function updateConversationProgress({
  convex,
  conversationId,
  userId,
  progress,
  stepTitle,
  status,
  processingError,
}: {
  convex: ConvexHttpClient;
  conversationId: any;
  userId: any;
  progress: number;
  stepTitle: string;
  status?: "processing" | "completed";
  processingError?: string | null;
}) {
  try {
    await convex.mutation(api.Conversations.UpdateConversation, {
      userId,
      conversationId,
      status,
      processingProgress: progress,
      processingStepTitle: stepTitle,
      processingError,
    });
  } catch (error) {
    if (!isConversationProgressValidationError(error)) {
      throw error;
    }

    await convex.mutation(api.Conversations.UpdateConversation, {
      userId,
      conversationId,
      status,
    });
  }
}

export function getProcessingErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return "Something went wrong while processing this conversation.";
}

export async function markConversationProcessingFailed({
  convex,
  conversationId,
  userId,
  progress,
  error,
}: {
  convex: ConvexHttpClient;
  conversationId: any;
  userId: any;
  progress?: number;
  error: unknown;
}) {
  const existingConversation = await convex.query(
    api.Conversations.GetConversationById,
    {
      conversationId,
    }
  );

  await updateConversationProgress({
    convex,
    userId,
    conversationId,
    progress: Math.max(
      0,
      Math.min(99, progress ?? existingConversation?.processingProgress ?? 0)
    ),
    stepTitle: "Processing failed",
    status: "processing",
    processingError: getProcessingErrorMessage(error),
  });
}

export function parseTranscriptJson(value?: string | null): TranscriptTurn[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is TranscriptTurn =>
        item &&
        typeof item === "object" &&
        typeof item.speaker === "string" &&
        typeof item.text === "string" &&
        typeof item.timestamp === "string"
    );
  } catch {
    return [];
  }
}

export function transcriptToPrompt(turns: TranscriptTurn[]) {
  return turns
    .map((turn) => `[${turn.timestamp}] ${turn.speaker}: ${turn.text}`)
    .join("\n");
}

export function isUserTurn(turn: TranscriptTurn) {
  return (
    typeof turn.speaker === "string" &&
    turn.speaker.trim().toLowerCase() === "user"
  );
}

export function parseTurnRefs(value: unknown): TurnRef[] {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (item): item is TurnRef =>
      !!item &&
      typeof item === "object" &&
      typeof (item as TurnRef).text === "string" &&
      typeof (item as TurnRef).timestamp === "string"
  );
}

export function toConvexTurnRefs(value: unknown): TurnRef[] | undefined {
  const turnRefs = parseTurnRefs(value);
  return turnRefs.length
    ? turnRefs.map((ref) => ({ text: ref.text, timestamp: ref.timestamp }))
    : undefined;
}

export function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export function safeParseSemanticMemoryState(text: string): SemanticMemory {
  const cleaned = cleanJsonResponse(text);
  return parseSemanticMemory(cleaned) ?? emptySemanticMemory();
}

export function getLastTranscriptTimestamp(turns: TranscriptTurn[]) {
  for (let index = turns.length - 1; index >= 0; index -= 1) {
    const value = turns[index]?.timestamp?.trim();
    if (value) return value;
  }

  return "0:00:00";
}

export function computeRelevantMomentCount(evidence: unknown): number {
  return new Set(
    parseStringArray(evidence)
      .map((value) => value.trim())
      .filter(Boolean)
  ).size;
}

export function cleanJsonResponse(text: string) {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

export function safeParseCoreGradingResult(text: string): CoreGradingResult {
  const cleaned = cleanJsonResponse(text);
  const parsed = JSON.parse(cleaned);

  return {
    summary: parsed.summary ?? "",
    overallScore: parsed.overallScore,
    recommendations: parseStringArray(parsed.recommendations),
    results: Array.isArray(parsed.results)
      ? parsed.results.map((result) => ({
          categoryId: result?.categoryId ?? "",
          criterionId: result?.criterionId ?? "",
          count: result?.count,
          score: result?.score,
          maxScore: result?.maxScore,
          feedback: result?.feedback,
          evidence: parseStringArray(result?.evidence),
        }))
      : [],
  };
}

export function withComputedCounts(grading: CoreGradingResult): CoreGradingResult {
  return {
    ...grading,
    results: grading.results.map((result) => ({
      ...result,
      count: computeRelevantMomentCount(result.evidence),
    })),
  };
}

export function safeParseTurnRefCorrectionResult(
  text: string
): TurnRefCorrectionResult {
  const cleaned = cleanJsonResponse(text);
  const parsed = JSON.parse(cleaned);

  return {
    results: Array.isArray(parsed.results)
      ? parsed.results.map((result) => ({
          categoryId: result?.categoryId ?? "",
          criterionId: result?.criterionId ?? "",
          turnRefs: parseTurnRefs(result?.turnRefs),
        }))
      : [],
  };
}

export function withTurnRefs(
  grading: CoreGradingResult,
  corrections: TurnRefCorrectionResult
) {
  const turnRefMap = new Map(
    corrections.results.map((result) => [
      `${result.categoryId}:${result.criterionId}`,
      parseTurnRefs(result.turnRefs),
    ])
  );

  return {
    ...grading,
    results: grading.results.map((result) => ({
      ...result,
      turnRefs:
        turnRefMap.get(`${result.categoryId}:${result.criterionId}`) ?? [],
    })),
  };
}

export function buildEmptyTurnRefCorrectionResult(
  candidates: Array<{ categoryId: string; criterionId: string }>
): TurnRefCorrectionResult {
  return {
    results: candidates.map((candidate) => ({
      categoryId: candidate.categoryId,
      criterionId: candidate.criterionId,
      turnRefs: [],
    })),
  };
}

export async function requestTurnRefCorrections(args: {
  client: OpenAI;
  transcriptForPrompt: string;
  correctionPrompt: {
    prompt?: string;
    candidates?: Array<{ categoryId?: string; criterionId?: string }>;
  };
  conversationId: unknown;
  situation?: string;
  personaName?: string;
}) {
  const messages = [
    {
      role: "system" as const,
      content: TURN_REF_CORRECTION_SYSTEM_PROMPT,
    },
    {
      role: "user" as const,
      content: `Roleplay situation:\n${args.situation ?? ""}\n\nPersona name:\n${args.personaName ?? ""}\n\nCriteria needing phrasing suggestions:\n${args.correctionPrompt.prompt ?? ""}\n\nFull transcript:\n${args.transcriptForPrompt}`,
    },
  ];

  const firstResponse = await args.client.chat.completions.create({
    model: INNGEST_LLM_MODEL,
    messages,
    temperature: 0.2,
    response_format: { type: "json_object" },
  } as any);

  const firstText = firstResponse.choices?.[0]?.message?.content?.trim();
  if (firstText) {
    return firstText;
  }

  console.warn(
    "TurnRef correction response was empty, retrying without response_format",
    {
      conversationId: args.conversationId,
    }
  );

  const retryResponse = await args.client.chat.completions.create({
    model: INNGEST_LLM_MODEL,
    messages,
    temperature: 0.2,
  } as any);

  const retryText = retryResponse.choices?.[0]?.message?.content?.trim();
  if (retryText) {
    return retryText;
  }

  console.warn(
    "TurnRef correction retry response was still empty, using empty fallback",
    {
      conversationId: args.conversationId,
    }
  );

  return JSON.stringify(
    buildEmptyTurnRefCorrectionResult(
      (args.correctionPrompt.candidates ?? []).map((candidate) => ({
        categoryId: candidate.categoryId ?? "",
        criterionId: candidate.criterionId ?? "",
      }))
    )
  );
}
