import OpenAI from "openai";
import { inngest } from "./client";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

type TranscriptTurn = {
  speaker: string;
  text: string;
  timestamp: string;
};

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

function parseTranscriptJson(value?: string | null): TranscriptTurn[] {
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

function transcriptToPrompt(turns: TranscriptTurn[]) {
  return turns
    .map((turn) => `[${turn.timestamp}] ${turn.speaker}: ${turn.text}`)
    .join("\n");
}

function buildRubricPrompt(rubric: any) {
  return JSON.stringify(
    {
      rubric: {
        id: rubric._id,
        name: rubric.name,
        description: rubric.description,
        categories: (rubric.categories ?? []).map((category: any) => ({
          id: category._id,
          name: category.name,
          description: category.description,
          scoringMode: category.scoringMode,
          weight: category.weight,
          enabled: category.enabled,
          criteria: (category.criteria ?? []).map((criterion: any) => ({
            id: criterion._id,
            name: criterion.name,
            description: criterion.description,
            weight: criterion.weight,
            enabled: criterion.enabled,
            targetMin: criterion.targetMin,
            targetMax: criterion.targetMax,
            gradingPromptHint: criterion.gradingPromptHint,
            examples: criterion.examples,
          })),
        })),
      },
    },
    null,
    2
  );
}

type GradingResult = {
  summary: string;
  overallScore?: number;
  recommendations?: string[];
  results: Array<{
    categoryId: string;
    criterionId: string;
    count?: number;
    score?: number;
    maxScore?: number;
    feedback?: string;
    evidence?: string[];
    turnRefs?: number[];
  }>;
};

function safeParseGradingResult(text: string): GradingResult {
  const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  const parsed = JSON.parse(cleaned);

  return {
    summary: parsed.summary ?? "",
    overallScore: parsed.overallScore,
    recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
    results: Array.isArray(parsed.results) ? parsed.results : [],
  };
}

export const conversationProcessing = inngest.createFunction(
  {
    id: "conversations-processing",
    triggers: [{ event: "conversations/processing" }],
  },
  async ({ event, step }) => {
    const conversation = await step.run("fetch-conversation", async () => {
      return convex.query(api.Conversations.GetConversationDetails, {
        userId: event.data.userId as any,
        conversationId: event.data.conversationId as any,
      });
    });

    if (!conversation) {
      throw new Error("Conversation not found");
    }

    const transcriptTurns = await step.run("parse-transcript", async () => {
      return parseTranscriptJson(conversation.transcriptText);
    });

    if (transcriptTurns.length === 0) {
      await step.run("mark-completed-empty-transcript", async () => {
        await convex.mutation(api.Conversations.UpdateConversation, {
          userId: event.data.userId as any,
          conversationId: event.data.conversationId as any,
          summary: "",
          status: "completed",
        });
      });

      return { ok: true, transcriptTurns: 0 };
    }


    const transcriptForSummary = transcriptToPrompt(transcriptTurns as TranscriptTurn[]);

    const summary = await step.run("generate-summary-without-rubric", async () => {
      const response = await client.chat.completions.create({
        model: "nvidia/nemotron-3-super-120b-a12b:free",
        messages: [
          {
            role: "system",
            content: `
                  You are an expert summarizer. You write readable, concise, simple content.
                  You are given a transcript of a meeting and you need to summarize it.

                  Use the following markdown structure for every output:

                  ### Overview
                  Provide a detailed, engaging summary of the session's content. Focus on major features, user workflows, and any key takeaways. Write in a narrative style, using full sentences. Highlight unique or powerful aspects of the product, platform, or discussion.

                  ### Notes
                  Break down key content into thematic sections with timestamp ranges. Each section should summarize key points, actions, or demos in bullet format.
                  `.trim(),
          },
          {
            role: "user",
            content: `Transcript:\n\n${transcriptForSummary}`,
          },
        ],
        temperature: 0.2,
      } as any);

      return response.choices?.[0]?.message?.content?.trim() || "";
    });

    await step.run("save-summary-no-rubric", async () => {
      await convex.mutation(api.Conversations.UpdateConversation, {
        userId: event.data.userId as any,
        conversationId: event.data.conversationId as any,
        summary,
      });
    });

    const rubric = await step.run("fetch-rubric-structure", async () => {
      return convex.query(api.AssessmentFramework.GetFrameworkWithStructure, {
        frameworkId: conversation.rubricId as any,
      });
    });

    if (!rubric) {
      throw new Error("Rubric not found");
    }

    const transcriptForPrompt = await step.run("prepare-transcript", async () => {
      return transcriptToPrompt(transcriptTurns as TranscriptTurn[]);
    });

    const rubricPrompt = await step.run("prepare-rubric", async () => {
      return buildRubricPrompt(rubric);
    });

    const gradingText = await step.run("grade-transcript-against-rubric", async () => {
      const response = await client.chat.completions.create({
        model: "nvidia/nemotron-3-super-120b-a12b:free",
        messages: [
          {
            role: "system",
            content: `
                    You are an expert conversation assessor.

                    You will be given:
                    1. A transcript (User and Assistant turns with timestamps)
                    2. A rubric with categories and criteria

                    Return ONLY valid JSON with this exact shape:
                    {
                      "summary": "string",
                      "overallScore": 0,
                      "recommendations": ["string"],
                      "results": [
                        {
                          "categoryId": "string",
                          "criterionId": "string",
                          "count": 0,
                          "score": 0,
                          "maxScore": 10,
                          "feedback": "string",
                          "evidence": ["string"],
                          "turnRefs": [1, 2]
                        }
                      ]
                    }

                    Rules:
                    - Use the provided categoryId and criterionId exactly.
                    - Grade USER based on only enabled categories/criteria.
                    - feedback should explain the score clearly.
                    - evidence should quote short excerpts from the USER transcript.
                    - turnRefs should refer to USER transcript turn positions starting from 1.
                    - summary should be a concise overall evaluation aligned to the rubric.
                    - recommendations should be practical coaching suggestions.
                    - Return JSON only.
                                `.trim(),
          },
          {
            role: "user",
            content: `Rubric:\n${rubricPrompt}\n\nTranscript:\n${transcriptForPrompt}`,
          },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
      } as any);

      const text = response.choices?.[0]?.message?.content?.trim();
      if (!text) throw new Error("Empty grading response from model");
      return text;
    });

    const grading = await step.run("parse-grading-json", async () => {
      return safeParseGradingResult(gradingText);
    });

    const assessment = await step.run("create-conversation-assessment", async () => {
      return convex.mutation(api.ConversationAssessment.CreateConversationAssessment, {
        conversationId: conversation._id as any,
        frameworkId: rubric._id as any,
        status: "completed",
        overallScore: grading.overallScore,
        summary: grading.summary,
        recommendations: grading.recommendations,
        rawModelOutput: grading,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    await step.run("save-conversation-results", async () => {
      for (const result of grading.results) {
        await convex.mutation(api.ConversationCriterionResult.UpsertConversationCriterionResult, {
          assessmentId: assessment._id as any,
          categoryId: result.categoryId as any,
          criterionId: result.criterionId as any,
          count: result.count,
          score: result.score,
          maxScore: result.maxScore,
          feedback: result.feedback,
          evidence: result.evidence,
          turnRefs: result.turnRefs,
        });
      }
    });

    await step.run("save-and-complete", async () => {
      await convex.mutation(api.Conversations.UpdateConversation, {
        userId: event.data.userId as any,
        conversationId: event.data.conversationId as any,
        status: "completed",
      });
    });

    return {
      ok: true,
      transcriptTurns: transcriptTurns.length,
      rubricId: rubric._id,
      assessmentId: assessment._id,
      results: grading.results.length,
    };
  }
);

export const testConversationProcessing = inngest.createFunction(
  { id: "test-conversations-processing", triggers: [{ event: "test/conversations-processing" }] },
  async ({ event }) => {
    return {
      received: true,
      conversationId: event.data.conversationId,
      userId: event.data.userId,
    };
  }
);