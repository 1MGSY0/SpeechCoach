import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";

export type ConversationGetMany = FunctionReturnType<typeof api.Conversations.ListConversations>;
export type ConversationGetOne = FunctionReturnType<typeof api.Conversations.GetConversationDetails>;
