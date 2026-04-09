import type { Id } from "@/convex/_generated/dataModel";
import { inngest } from "@/inngest/client";

interface ConversationProcessingEventData {
  conversationId: Id<"Conversations">;
  userId: Id<"User">;
  modelPipeline?: string;
  speechMetrics?: unknown;
  turnCount?: number;
  processingToken?: string;
}

export async function sendConversationProcessingEvent(
  data: ConversationProcessingEventData
) {
  return inngest.send({
    name: "conversations/processing",
    data,
  });
}

export async function sendConversationMemoryUpdateEvent(
  data: ConversationProcessingEventData & {
    trigger?: "snapshot" | "final";
    turnCount?: number;
  }
) {
  return inngest.send({
    name: "conversations/memory.update",
    data,
  });
}
