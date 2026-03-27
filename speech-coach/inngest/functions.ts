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

        const transcriptForSummary = await step.run(
        "prepare-transcript-for-summary",
        async () => transcriptToPrompt(transcriptTurns as TranscriptTurn[])
        );

        const summary = await step.run("generate-summary", async () => {
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
                content: `Summarize this transcript:\n\n${transcriptForSummary}`,
            },
            ],
            reasoning: { enabled: true },
            temperature: 0.2,
        }as any);

        const text = response.choices?.[0]?.message?.content?.trim();

        if (!text) {
            throw new Error("Empty response from OpenRouter");
        }

        return text;
        });

        await step.run("save-summary-and-complete", async () => {
        await convex.mutation(api.Conversations.UpdateConversation, {
            userId: event.data.userId as any,
            conversationId: event.data.conversationId as any,
            summary,
            status: "completed",
        });
        });

        return {
        ok: true,
        transcriptTurns: transcriptTurns.length,
        };
    }
);

export const helloWorld = inngest.createFunction(
  { id: "hello-world", triggers: [{ event: "test/hello-world" }] },
  async ({ event, step }) => {
    await step.sleep("wait-a-moment", "1s");
    return { message: `Hello ${event.data.email}!` };
  }
);