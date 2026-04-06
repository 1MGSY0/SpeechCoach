import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import {
  parseSemanticMemory,
  stringifySemanticMemory,
  type SemanticMemory,
} from "@/lib/semantic-memory";
import { inngest } from "./client";
import {
  buildEmptyTurnRefCorrectionResult,
  markConversationProcessingFailed,
  parseStringArray,
  parseTranscriptJson,
  requestTurnRefCorrections,
  safeParseCoreGradingResult,
  safeParseSemanticMemoryState,
  safeParseTurnRefCorrectionResult,
  toConvexTurnRefs,
  transcriptToPrompt,
  updateConversationProgress,
  withComputedCounts,
  withTurnRefs,
  type CoreGradingResult,
  type TranscriptTurn,
  type TurnRefCorrectionResult,
} from "./helper";
import { INNGEST_LLM_MODEL, createInngestLlmClient } from "./llm";
import {
  buildRubricPrompt,
  buildSemanticMemoryPrompt,
  buildTurnRefCorrectionPrompt,
  GRADING_SYSTEM_PROMPT,
  SEMANTIC_MEMORY_SYSTEM_PROMPT,
} from "./prompt";

const client = createInngestLlmClient();

const convexUrl =
  process.env.CONVEX_URL_INTERNAL ?? process.env.NEXT_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error("Missing CONVEX_URL_INTERNAL or NEXT_PUBLIC_CONVEX_URL");
}

const convex = new ConvexHttpClient(convexUrl, {
  skipConvexDeploymentUrlCheck: true,
});

function mergeProgressionLogs(
  previous: SemanticMemory["progressionReason"] = [],
  next: SemanticMemory["progressionReason"] = []
) {
  const merged: SemanticMemory["progressionReason"] = [];
  const seen = new Set<string>();

  for (const entry of [...previous, ...next]) {
    const normalizedLog = normalizeProgressionLog(entry.progressionLog);
    if (!normalizedLog) continue;

    const nextEntry = {
      timestamp: entry.timestamp,
      progressionLog: entry.progressionLog.trim(),
    };
    const duplicateIndex = merged.findIndex((item) =>
      isProgressionDuplicate(item.progressionLog, nextEntry.progressionLog)
    );

    if (duplicateIndex >= 0) {
      if (
        nextEntry.progressionLog.length >
        merged[duplicateIndex].progressionLog.length
      ) {
        merged[duplicateIndex] = nextEntry;
      }
      continue;
    }

    if (seen.has(normalizedLog)) continue;
    seen.add(normalizedLog);
    merged.push(nextEntry);
  }

  return merged.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

function normalizeProgressionLog(value: string) {
  return value
    .toLowerCase()
    .replace(/\b(the user|user|student|coach)\b/g, "user")
    .replace(/\b(persona|assistant)\b/g, "persona")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(may|might|likely|seems|seem|a bit|more|still|current|currently)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isProgressionDuplicate(a: string, b: string) {
  const normalizedA = normalizeProgressionLog(a);
  const normalizedB = normalizeProgressionLog(b);
  if (!normalizedA || !normalizedB) return false;
  if (normalizedA === normalizedB) return true;

  const shorter =
    normalizedA.length <= normalizedB.length ? normalizedA : normalizedB;
  const longer = normalizedA.length > normalizedB.length ? normalizedA : normalizedB;
  if (shorter.length >= 48 && longer.includes(shorter)) {
    return true;
  }

  const tokensA = new Set(normalizedA.split(" ").filter((token) => token.length > 2));
  const tokensB = new Set(normalizedB.split(" ").filter((token) => token.length > 2));
  if (!tokensA.size || !tokensB.size) return false;

  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) intersection += 1;
  }
  const union = new Set([...tokensA, ...tokensB]).size;
  return intersection / union >= 0.72;
}

type MemoryTimingEntry = {
  trigger: "snapshot" | "final" | "unknown";
  startedAt: string;
  completedAt: string;
  durationMs: number;
  turnCount: number;
  progressionLogs: number;
  promptInputChars?: number;
  memoryOutputChars?: number;
  stageDurationsMs?: Record<string, number>;
};

type MemoryMetrics = {
  runs: MemoryTimingEntry[];
  summary: {
    runCount: number;
    averageDurationMs: number | null;
    lastDurationMs: number | null;
    maxDurationMs: number | null;
    minDurationMs: number | null;
  };
};

function normalizeMemoryMetrics(value: unknown): MemoryMetrics {
  const runs = Array.isArray((value as any)?.runs)
    ? (value as any).runs
        .filter((item: any) => item && typeof item === "object")
        .map((item: any) => ({
          trigger:
            item.trigger === "snapshot" || item.trigger === "final"
              ? item.trigger
              : "unknown",
          startedAt:
            typeof item.startedAt === "string" ? item.startedAt : new Date().toISOString(),
          completedAt:
            typeof item.completedAt === "string"
              ? item.completedAt
              : new Date().toISOString(),
          durationMs:
            typeof item.durationMs === "number" && Number.isFinite(item.durationMs)
              ? item.durationMs
              : 0,
          turnCount:
            typeof item.turnCount === "number" && Number.isFinite(item.turnCount)
              ? item.turnCount
              : 0,
          progressionLogs:
            typeof item.progressionLogs === "number" &&
            Number.isFinite(item.progressionLogs)
              ? item.progressionLogs
              : 0,
          promptInputChars:
            typeof item.promptInputChars === "number" &&
            Number.isFinite(item.promptInputChars)
              ? item.promptInputChars
              : undefined,
          memoryOutputChars:
            typeof item.memoryOutputChars === "number" &&
            Number.isFinite(item.memoryOutputChars)
              ? item.memoryOutputChars
              : undefined,
          stageDurationsMs:
            item.stageDurationsMs && typeof item.stageDurationsMs === "object"
              ? Object.fromEntries(
                  Object.entries(item.stageDurationsMs).filter(
                    ([, value]) =>
                      typeof value === "number" && Number.isFinite(value)
                  )
                )
              : undefined,
        }))
    : [];

  const durations = runs.map((item) => item.durationMs).filter((value) => value >= 0);
  const averageDurationMs =
    durations.length > 0
      ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
      : null;

  return {
    runs,
    summary: {
      runCount: runs.length,
      averageDurationMs,
      lastDurationMs: runs.length ? runs[runs.length - 1]?.durationMs ?? null : null,
      maxDurationMs: durations.length ? Math.max(...durations) : null,
      minDurationMs: durations.length ? Math.min(...durations) : null,
    },
  };
}

function appendMemoryTimingEntry(
  existing: unknown,
  entry: MemoryTimingEntry
): MemoryMetrics {
  const current = normalizeMemoryMetrics(existing);
  return normalizeMemoryMetrics({
    runs: [...current.runs, entry],
  });
}

export const conversationMemoryUpdate = inngest.createFunction(
  {
    id: "conversations-memory-update",
    triggers: [{ event: "conversations/memory.update" }],
  },
  async ({ event, step }) => {
    const processingStartedAt = new Date();
    const stageDurationsMs: Record<string, number> = {};
    const timedStep = async <T>(
      name: string,
      fn: () => Promise<T>
    ): Promise<T> => {
      const startedAtMs = Date.now();
      try {
        return (await step.run(name, fn)) as T;
      } finally {
        stageDurationsMs[name] = Math.max(0, Date.now() - startedAtMs);
      }
    };

    const conversation = await timedStep("fetch-conversation", async () => {
      return convex.query(api.Conversations.GetConversationDetails, {
        userId: event.data.userId as any,
        conversationId: event.data.conversationId as any,
      });
    });

    if (!conversation) {
      throw new Error("Conversation not found");
    }

    const transcriptTurns = await timedStep("parse-transcript", async () => {
      return parseTranscriptJson(conversation.transcriptText);
    });

    if (!transcriptTurns.length) {
      return { ok: true, skipped: "empty-transcript" };
    }

    const currentTurnCount = transcriptTurns.length;
    const previousMemory = parseSemanticMemory(conversation.summary) ?? null;
    const previousTurnCount = previousMemory?.lastProcessedTurnCount ?? 0;
    const eventTurnCount =
      typeof event.data.turnCount === "number" && Number.isFinite(event.data.turnCount)
        ? event.data.turnCount
        : null;

    if (currentTurnCount <= previousTurnCount) {
      return {
        ok: true,
        skipped: "no-new-turns",
        currentTurnCount,
        previousTurnCount,
      };
    }

    if (eventTurnCount !== null && eventTurnCount <= previousTurnCount) {
      return {
        ok: true,
        skipped: "event-turns-already-processed",
        eventTurnCount,
        currentTurnCount,
        previousTurnCount,
      };
    }

    const rubric = await timedStep("fetch-rubric-structure", async () => {
      if (!conversation.rubricId) return null;

      return convex.query(api.AssessmentFramework.GetFrameworkWithStructure, {
        frameworkId: conversation.rubricId as any,
      });
    });

    const transcriptForPrompt = transcriptToPrompt(
      transcriptTurns as TranscriptTurn[]
    );

    const rubricPrompt = rubric ? buildRubricPrompt(rubric) : JSON.stringify({});
    const semanticMemoryPrompt = buildSemanticMemoryPrompt({
      rubricPrompt,
      transcriptForPrompt,
      baseInstructions: conversation.instructions ?? "",
      previousMemory,
      personaName: conversation.personaName ?? "",
    });

    const memoryText = await timedStep("generate-semantic-memory", async () => {
      const response = await client.chat.completions.create({
        model: INNGEST_LLM_MODEL,
        messages: [
          {
            role: "system",
            content: SEMANTIC_MEMORY_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: semanticMemoryPrompt,
          },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
      } as any);

      const text = response.choices?.[0]?.message?.content?.trim();
      if (!text) throw new Error("Empty semantic memory response from model");
      return text;
    });

    const memory = (await timedStep("parse-semantic-memory", async () => {
      return safeParseSemanticMemoryState(memoryText);
    })) as SemanticMemory;

    memory.rollingSummary =
      memory.rollingSummary || previousMemory?.rollingSummary || "";
    memory.extractedEntities = Array.from(
      new Set([
        ...(previousMemory?.extractedEntities ?? []),
        ...memory.extractedEntities,
      ])
    );
    memory.progressionReason = mergeProgressionLogs(
      previousMemory?.progressionReason ?? [],
      memory.progressionReason
    ).slice(-12);
    memory.lastProcessedTurnCount = currentTurnCount;

    const processingCompletedAt = new Date();
    const memoryMetrics = appendMemoryTimingEntry(conversation.memoryMetrics, {
      trigger:
        event.data.trigger === "snapshot" || event.data.trigger === "final"
          ? event.data.trigger
          : "unknown",
      startedAt: processingStartedAt.toISOString(),
      completedAt: processingCompletedAt.toISOString(),
      durationMs: Math.max(
        0,
        processingCompletedAt.getTime() - processingStartedAt.getTime()
      ),
      turnCount: currentTurnCount,
      progressionLogs: memory.progressionReason.length,
      promptInputChars: semanticMemoryPrompt.length,
      memoryOutputChars: memoryText.length,
      stageDurationsMs,
    });

    await timedStep("save-semantic-memory", async () => {
      await convex.mutation(api.Conversations.UpdateConversation, {
        userId: event.data.userId as any,
        conversationId: event.data.conversationId as any,
        summary: stringifySemanticMemory(memory),
        memoryMetrics,
      });
    });

    return {
      ok: true,
      turnCount: currentTurnCount,
      progressionLogs: memory.progressionReason.length,
      memoryProcessingMs: memoryMetrics.summary.lastDurationMs,
      averageMemoryProcessingMs: memoryMetrics.summary.averageDurationMs,
    };
  }
);

export const conversationProcessing = inngest.createFunction(
  {
    id: "conversations-processing",
    triggers: [{ event: "conversations/processing" }],
  },
  async ({ event, step }) => {
    try {
      const conversation = await step.run("fetch-conversation", async () => {
        await updateConversationProgress({
          convex,
          userId: event.data.userId as any,
          conversationId: event.data.conversationId as any,
          progress: 5,
          stepTitle: "Loading conversation details",
          status: "processing",
          processingError: null,
        });

        return convex.query(api.Conversations.GetConversationDetails, {
          userId: event.data.userId as any,
          conversationId: event.data.conversationId as any,
        });
      });

      if (!conversation) {
        throw new Error("Conversation not found");
      }

      const transcriptTurns = await step.run("parse-transcript", async () => {
        await updateConversationProgress({
          convex,
          userId: event.data.userId as any,
          conversationId: event.data.conversationId as any,
          progress: 10,
          stepTitle: "Parsing transcript",
        });

        return parseTranscriptJson(conversation.transcriptText);
      });

      if (transcriptTurns.length === 0) {
        await step.run("mark-completed-empty-transcript", async () => {
          await updateConversationProgress({
            convex,
            userId: event.data.userId as any,
            conversationId: event.data.conversationId as any,
            progress: 100,
            stepTitle: "Completed",
            status: "completed",
          });

          await convex.mutation(api.Conversations.UpdateConversation, {
            userId: event.data.userId as any,
            conversationId: event.data.conversationId as any,
            summary: "",
            status: "completed",
            processingError: null,
          });
        });

        return { ok: true, transcriptTurns: 0 };
      }

      const transcriptForSummary = transcriptToPrompt(
        transcriptTurns as TranscriptTurn[]
      );
      await step.run("load-memory-json", async () => {
        await updateConversationProgress({
          convex,
          userId: event.data.userId as any,
          conversationId: event.data.conversationId as any,
          progress: 15,
          stepTitle: "Loading semantic memory",
        });

        return conversation.summary ?? "";
      });

      const rubric = await step.run("fetch-rubric-structure", async () => {
        await updateConversationProgress({
          convex,
          userId: event.data.userId as any,
          conversationId: event.data.conversationId as any,
          progress: 18,
          stepTitle: "Loading rubric",
        });

        return convex.query(api.AssessmentFramework.GetFrameworkWithStructure, {
          frameworkId: conversation.rubricId as any,
        });
      });

      if (!rubric) {
        throw new Error("Rubric not found");
      }

      const transcriptForPrompt = await step.run(
        "prepare-transcript",
        async () => {
          await updateConversationProgress({
            convex,
            userId: event.data.userId as any,
            conversationId: event.data.conversationId as any,
            progress: 20,
            stepTitle: "Preparing transcript for assessment",
          });

          return transcriptToPrompt(transcriptTurns as TranscriptTurn[]);
        }
      );

      const rubricPrompt = await step.run("prepare-rubric", async () => {
        await updateConversationProgress({
          convex,
          userId: event.data.userId as any,
          conversationId: event.data.conversationId as any,
          progress: 23,
          stepTitle: "Preparing rubric criteria",
        });

        return buildRubricPrompt(rubric);
      });

      const gradingText = await step.run(
        "grade-transcript-against-rubric",
        async () => {
          await updateConversationProgress({
            convex,
            userId: event.data.userId as any,
            conversationId: event.data.conversationId as any,
            progress: 25,
            stepTitle: "Grading transcript",
          });

          const response = await client.chat.completions.create({
            model: INNGEST_LLM_MODEL,
            messages: [
              {
                role: "system",
                content: GRADING_SYSTEM_PROMPT,
              },
              {
                role: "user",
                content: `Roleplay situation:\n${conversation.instructions ?? ""}\n\nPersona name:\n${conversation.personaName ?? ""}\n\nRubric:\n${rubricPrompt}\n\nTranscript:\n${transcriptForPrompt}`,
              },
            ],
            temperature: 0.2,
            response_format: { type: "json_object" },
          } as any);

          const text = response.choices?.[0]?.message?.content?.trim();
          if (!text) throw new Error("Empty grading response from model");
          return text;
        }
      );

      const grading = (await step.run("parse-grading-json", async () => {
        await updateConversationProgress({
          convex,
          userId: event.data.userId as any,
          conversationId: event.data.conversationId as any,
          progress: 50,
          stepTitle: "Parsing grading results",
        });

        return safeParseCoreGradingResult(gradingText);
      })) as CoreGradingResult;

      const normalizedGrading = await step.run(
        "compute-grading-counts",
        async () => {
          await updateConversationProgress({
            convex,
            userId: event.data.userId as any,
            conversationId: event.data.conversationId as any,
            progress: 52,
            stepTitle: "Computing rubric counts",
          });

          return withComputedCounts(grading);
        }
      );

      const assessment = await step.run(
        "create-conversation-assessment",
        async () => {
          await updateConversationProgress({
            convex,
            userId: event.data.userId as any,
            conversationId: event.data.conversationId as any,
            progress: 54,
            stepTitle: "Creating assessment",
          });

          return convex.mutation(
            api.ConversationAssessment.CreateConversationAssessment,
            {
              conversationId: conversation._id as any,
              frameworkId: rubric._id as any,
              status: "completed",
              overallScore: normalizedGrading.overallScore,
              summary: normalizedGrading.summary,
              recommendations: normalizedGrading.recommendations,
              rawModelOutput: normalizedGrading,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          );
        }
      );

      await step.run("save-conversation-results", async () => {
        await updateConversationProgress({
          convex,
          userId: event.data.userId as any,
          conversationId: event.data.conversationId as any,
          progress: 56,
          stepTitle: "Saving assessment results",
        });

        for (const result of normalizedGrading.results) {
          await convex.mutation(
            api.ConversationCriterionResult.UpsertConversationCriterionResult,
            {
              assessmentId: assessment._id as any,
              categoryId: result.categoryId as any,
              criterionId: result.criterionId as any,
              count: result.count,
              score: result.score,
              maxScore: result.maxScore,
              feedback: result.feedback,
              evidence: result.evidence,
            }
          );
        }
      });

      const assessmentWithResults = await step.run(
        "fetch-assessment-full-for-turnrefs",
        async () => {
          await updateConversationProgress({
            convex,
            userId: event.data.userId as any,
            conversationId: event.data.conversationId as any,
            progress: 58,
            stepTitle: "Loading speaking improvement data",
          });

          return convex.query(
            api.ConversationAssessment.GetConversationAssessmentFull,
            {
              assessmentId: assessment._id as any,
            }
          );
        }
      );

      if (!assessmentWithResults) {
        throw new Error("Conversation assessment not found");
      }

      const turnRefTranscriptPrompt = await step.run(
        "prepare-transcript-for-turnrefs",
        async () => {
          await updateConversationProgress({
            convex,
            userId: event.data.userId as any,
            conversationId: event.data.conversationId as any,
            progress: 60,
            stepTitle: "Preparing transcript for improvement suggestions",
          });

          return transcriptForSummary;
        }
      );

      let corrections: TurnRefCorrectionResult = { results: [] };

      if (turnRefTranscriptPrompt.trim()) {
        const correctionPrompt = await step.run(
          "prepare-turnref-rubric-slice",
          async () => {
            await updateConversationProgress({
              convex,
              userId: event.data.userId as any,
              conversationId: event.data.conversationId as any,
              progress: 65,
              stepTitle: "Selecting criteria for improvement suggestions",
            });

            return buildTurnRefCorrectionPrompt(
              assessmentWithResults.results ?? []
            );
          }
        );

        if (correctionPrompt.hasCandidates) {
          const correctionsText = await step.run(
            "generate-turnref-corrections",
            async () => {
              await updateConversationProgress({
                convex,
                userId: event.data.userId as any,
                conversationId: event.data.conversationId as any,
                progress: 95,
                stepTitle: "Generating speaking improvement suggestions",
              });

              return requestTurnRefCorrections({
                client,
                transcriptForPrompt: turnRefTranscriptPrompt,
                correctionPrompt,
                conversationId: event.data.conversationId,
                situation: conversation.instructions ?? "",
                personaName: conversation.personaName ?? "",
              });
            }
          );

          corrections = (await step.run(
            "parse-turnref-corrections",
            async () => {
              await updateConversationProgress({
                convex,
                userId: event.data.userId as any,
                conversationId: event.data.conversationId as any,
                progress: 80,
                stepTitle: "Parsing improvement suggestions",
              });

              try {
                return safeParseTurnRefCorrectionResult(correctionsText);
              } catch (error) {
                console.warn("Failed to parse turnRef correction response", {
                  conversationId: event.data.conversationId,
                  error,
                });

                return buildEmptyTurnRefCorrectionResult(
                  correctionPrompt.candidates
                );
              }
            }
          )) as TurnRefCorrectionResult;

          await step.run("save-turnref-corrections", async () => {
            await updateConversationProgress({
              convex,
              userId: event.data.userId as any,
              conversationId: event.data.conversationId as any,
              progress: 90,
              stepTitle: "Saving speaking improvement suggestions",
            });

            const correctionMap = new Map(
              corrections.results.map((result) => [
                `${result.categoryId}:${result.criterionId}`,
                toConvexTurnRefs(result.turnRefs) ?? [],
              ])
            );

            for (const result of assessmentWithResults.results ?? []) {
              const score =
                typeof result.score === "number" ? result.score : undefined;
              const maxScore =
                typeof result.maxScore === "number" ? result.maxScore : 10;
              if (score !== undefined && score >= maxScore) continue;

              const turnRefs =
                correctionMap.get(
                  `${result.categoryId}:${result.criterionId}`
                ) ?? [];

              await convex.mutation(
                api.ConversationCriterionResult.UpdateConversationCriterionResult,
                {
                  resultId: result._id as any,
                  turnRefs,
                }
              );
            }
          });
        }
      }

      await step.run("append-turnrefs-to-raw-output", async () => {
        await updateConversationProgress({
          convex,
          userId: event.data.userId as any,
          conversationId: event.data.conversationId as any,
          progress: 95,
          stepTitle: "Finalizing evaluation",
        });

        const current = await convex.query(
          api.ConversationAssessment.GetConversationAssessmentById,
          {
            assessmentId: assessment._id as any,
          }
        );

        if (!current) {
          throw new Error(
            "Conversation assessment not found while updating raw output"
          );
        }

        await convex.mutation(
          api.ConversationAssessment.UpdateConversationAssessment,
          {
            assessmentId: assessment._id as any,
            rawModelOutput: withTurnRefs(
              {
                summary: current.rawModelOutput?.summary ?? assessment.summary ?? "",
                overallScore:
                  current.rawModelOutput?.overallScore ?? assessment.overallScore,
                recommendations:
                  current.rawModelOutput?.recommendations ??
                  assessment.recommendations ??
                  [],
                results:
                  current.rawModelOutput?.results ??
                  (assessmentWithResults.results ?? []).map((result: any) => ({
                    categoryId: result.categoryId,
                    criterionId: result.criterionId,
                    count: result.count,
                    score: result.score,
                    maxScore: result.maxScore,
                    feedback: result.feedback,
                    evidence: parseStringArray(result.evidence),
                  })),
              } as CoreGradingResult,
              corrections
            ),
            updatedAt: new Date().toISOString(),
          }
        );
      });

      await step.run("complete-conversation-processing", async () => {
        await updateConversationProgress({
          convex,
          userId: event.data.userId as any,
          conversationId: event.data.conversationId as any,
          progress: 100,
          stepTitle: "Completed",
          status: "completed",
          processingError: null,
        });
      });

      return {
        ok: true,
        assessmentId: assessment._id,
        corrections: corrections.results.length,
        transcriptTurns: transcriptTurns.length,
        rubricId: rubric._id,
        results: normalizedGrading.results.length,
        modelPipeline:
          event.data.modelPipeline ?? conversation.modelPipeline ?? "gemini_realtime",
        speechMetricMode:
          typeof conversation.speechMetrics === "object" &&
          conversation.speechMetrics !== null &&
          "mode" in conversation.speechMetrics
            ? conversation.speechMetrics.mode
            : null,
        speechMetricTurns:
          typeof conversation.speechMetrics === "object" &&
          conversation.speechMetrics !== null &&
          "turnCount" in conversation.speechMetrics
            ? conversation.speechMetrics.turnCount
            : event.data.turnCount ?? null,
      };
    } catch (error) {
      await markConversationProcessingFailed({
        convex,
        userId: event.data.userId as any,
        conversationId: event.data.conversationId as any,
        error,
      });

      throw error;
    }
  }
);

export const testConversationProcessing = inngest.createFunction(
  {
    id: "test-conversations-processing",
    triggers: [{ event: "test/conversations-processing" }],
  },
  async ({ event }) => {
    return {
      received: true,
      conversationId: event.data.conversationId,
      userId: event.data.userId,
    };
  }
);
