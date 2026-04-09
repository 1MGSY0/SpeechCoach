import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import {
  conversationMemoryUpdate,
  testConversationProcessing,
  conversationProcessing,
} from "@/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    testConversationProcessing,
    conversationMemoryUpdate,
    conversationProcessing,
  ],
});
