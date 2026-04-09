import { NextRequest, NextResponse } from "next/server";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { serverFetchMutation, serverFetchQuery } from "@/lib/convex-server";
import { getServerContext } from "@/lib/convex_user";
import { sendConversationProcessingEvent } from "@/lib/inngest-events";

export const runtime = "nodejs";

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
  status: "processing" | "completed";
  processingProgress?: number;
  processingStepTitle?: string;
  processingError?: string | null;
  processingToken?: string;
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
      status: args.status,
      processingToken: args.processingToken,
    });
  }
}

function createProcessingToken() {
  return crypto.randomUUID();
}

export async function POST(req: NextRequest) {
  const { convexUserId } = await getServerContext();
  const body = (await req.json()) as {
    conversationId?: string;
  };

  if (!body.conversationId) {
    return NextResponse.json(
      { error: "Missing conversationId" },
      { status: 400 }
    );
  }

  const conversationId = body.conversationId as Id<"Conversations">;
  const conversation = await serverFetchQuery(
    api.Conversations.GetConversationDetails,
    {
      userId: convexUserId,
      conversationId,
    }
  );

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 }
    );
  }

  try {
    const processingToken = createProcessingToken();

    await updateConversationStatusCompat({
      userId: convexUserId,
      conversationId,
      status: "processing",
      processingProgress: 0,
      processingStepTitle: "Queued for re-evaluation",
      processingError: null,
      processingToken,
    });

    await sendConversationProcessingEvent({
      conversationId,
      userId: convexUserId,
      processingToken,
    });
  } catch (error) {
    console.error("Failed to re-send conversation processing event", {
      conversationId,
      userId: convexUserId,
      error,
    });

    try {
      await updateConversationStatusCompat({
        userId: convexUserId,
        conversationId,
        status: "completed",
        processingProgress: conversation.processingProgress ?? 100,
        processingStepTitle: conversation.processingStepTitle ?? "Completed",
        processingError: null,
        processingToken: conversation.processingToken,
      });
    } catch (rollbackError) {
      console.error("Failed to roll back re-evaluation status", {
        conversationId,
        userId: convexUserId,
        rollbackError,
      });
    }

    return NextResponse.json(
      { error: "Failed to re-evaluate" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
