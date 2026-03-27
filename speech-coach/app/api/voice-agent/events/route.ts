import { NextRequest, NextResponse } from "next/server";
import { fetchMutation } from "convex/nextjs";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { CallTranscriptionReadyEvent, CallRecordingReadyEvent} from "@stream-io/node-sdk";
import { inngest } from "@/inngest/client";

export const runtime = "nodejs";

const pipelineToken = process.env.VOICE_PIPELINE_TOKEN;

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

  switch (payload.type) {
    case "call.transcription_ready": {
      await fetchMutation(api.Conversations.UpdateConversation, {
        userId,
        conversationId,
        transcriptText: payload.transcriptText ?? undefined,
        status: "processing",
      });

      try {
        await inngest.send({
          name: "conversations/processing",
          data: {
            conversationId,
            userId,
          },
        });
      } catch (err) {
        console.warn("⚠️ Inngest not connected — skipping event", {
          conversationId,
          userId,
          error: err,
        });
      }
      break;
    }
  }
  return NextResponse.json({ status: "ok" });
}
