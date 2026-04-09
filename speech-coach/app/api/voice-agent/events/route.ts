import { after, NextRequest, NextResponse } from "next/server";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { serverFetchMutation, serverFetchQuery } from "@/lib/convex-server";
import {
  sendConversationMemoryUpdateEvent,
  sendConversationProcessingEvent,
} from "@/lib/inngest-events";

export const runtime = "nodejs";

const pipelineToken = process.env.VOICE_PIPELINE_TOKEN;

function isConversationProgressValidationError(error: unknown) {
  return (
    error instanceof Error &&
    (error.message.includes("extra field `processingProgress`") ||
      error.message.includes("extra field `processingError`") ||
      error.message.includes("extra field `processingToken`"))
  );
}

async function updateConversationStatusCompat(args: {
  userId: Id<"User">;
  conversationId: Id<"Conversations">;
  transcriptText?: string;
  status: "processing" | "completed";
  processingProgress?: number;
  processingStepTitle?: string;
  processingError?: string | null;
  processingToken?: string;
  speechMetrics?: unknown;
}) {
  try {
    return await serverFetchMutation(api.Conversations.UpdateConversation, args);
  } catch (error) {
    if (!isConversationProgressValidationError(error)) {
      throw error;
    }

    return serverFetchMutation(api.Conversations.UpdateConversation, {
      userId: args.userId,
      conversationId: args.conversationId,
      transcriptText: args.transcriptText,
      status: args.status,
      processingToken: args.processingToken,
      speechMetrics: args.speechMetrics,
    });
  }
}

function createProcessingToken() {
  return crypto.randomUUID();
}

async function isSemanticMemoryEnabled(
  userId: Id<"User">,
  conversationId: Id<"Conversations">
) {
  const conversation = await serverFetchQuery(api.Conversations.GetConversationDetails, {
    userId,
    conversationId,
  });

  return conversation?.semanticMemoryEnabled !== false;
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-pipeline-token") ?? "";
  if (token !== pipelineToken) {
    console.warn("voice-agent events unauthorized", {
      hasToken: Boolean(pipelineToken),
      tokenProvided: Boolean(token),
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await req.json()) as {
    type?: string;
    conversationId?: string;
    userId?: string;
    transcriptText?: string;
    recordingUrl?: string;
    summary?: string;
    turnCount?: number;
    modelPipeline?: string;
    speechMetrics?: unknown;
  };

  if (!payload.type || !payload.conversationId || !payload.userId) {
    console.warn("voice-agent events missing payload", payload);
    return NextResponse.json(
      { error: "Missing event payload" },
      { status: 400 }
    );
  }

  console.log("voice-agent events payload", payload);

  const userId = payload.userId as Id<"User">;
  const conversationId = payload.conversationId as Id<"Conversations">;

  after(async () => {
    try {
      switch (payload.type) {
        case "call.transcript_snapshot": {
          await serverFetchMutation(api.Conversations.UpdateConversation, {
            userId,
            conversationId,
            transcriptText: payload.transcriptText ?? undefined,
            status: "active",
          });

          if (await isSemanticMemoryEnabled(userId, conversationId)) {
            try {
              await sendConversationMemoryUpdateEvent({
                conversationId,
                userId,
                trigger: "snapshot",
                turnCount: payload.turnCount,
              });
            } catch (err) {
              console.warn("Skipping memory update event dispatch", {
                conversationId,
                userId,
                error: err,
              });
            }
          }
          break;
        }
        case "call.transcription_ready": {
          const processingToken = createProcessingToken();

          await updateConversationStatusCompat({
            userId,
            conversationId,
            transcriptText: payload.transcriptText ?? undefined,
            status: "processing",
            processingProgress: 0,
            processingStepTitle: "Transcript received",
            processingError: null,
            processingToken,
            speechMetrics: payload.speechMetrics,
          });

          if (await isSemanticMemoryEnabled(userId, conversationId)) {
            try {
              await sendConversationMemoryUpdateEvent({
                conversationId,
                userId,
                trigger: "final",
                turnCount: payload.turnCount,
              });
            } catch (err) {
              console.warn("Skipping final memory update event dispatch", {
                conversationId,
                userId,
                error: err,
              });
            }
          }

          try {
            await sendConversationProcessingEvent({
              conversationId,
              userId,
              modelPipeline: payload.modelPipeline,
              speechMetrics: payload.speechMetrics,
              turnCount: payload.turnCount,
              processingToken,
            });
          } catch (err) {
            console.warn("Inngest not connected, skipping event", {
              conversationId,
              userId,
              error: err,
            });
          }
          break;
        }
      }
    } catch (error) {
      console.error("voice-agent events background processing failed", {
        payloadType: payload.type,
        conversationId,
        userId,
        error,
      });
    }
  });

  return NextResponse.json({ status: "accepted" });
}
