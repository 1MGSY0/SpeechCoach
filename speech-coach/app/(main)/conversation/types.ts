import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { ConversationStatus as ConversationStatusValues } from "@/services/conversation-status";

export type ConversationGetMany = FunctionReturnType<typeof api.Conversations.ListConversations>;
export type ConversationGetOne = FunctionReturnType<typeof api.Conversations.GetConversationDetails>;

export const ConversationStatus = ConversationStatusValues;
export type ConversationStatus = (typeof ConversationStatusValues)[keyof typeof ConversationStatusValues];
