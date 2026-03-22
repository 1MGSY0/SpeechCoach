import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { CONVERSATION_STATUSES } from "../services/conversation-status";

const statusValidator = v.union(...CONVERSATION_STATUSES.map((status) => v.literal(status)));

// Create a new Conversation document
export const CreateConversation = mutation({
    args: {
        userId: v.id("User"),
        personaId: v.id("Persona"),
        name: v.string(),
        status: v.optional(statusValidator),
        startedAt: v.optional(v.string()),
        endedAt: v.optional(v.string()),
        transcriptUrl: v.optional(v.string()),
        recordingUrl: v.optional(v.string()),
        summary: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const now = new Date().toISOString();
        const conversationId = await ctx.db.insert("Conversations", {
            name: args.name,
            userId: args.userId,
            personaId: args.personaId,
            status: args.status ?? "upcoming",
            startedAt: args.startedAt,
            endedAt: args.endedAt,
            transcriptUrl: args.transcriptUrl,
            recordingUrl: args.recordingUrl,
            summary: args.summary,
            updatedAt: now,
        });

        return conversationId;
    },
});

// Update an existing Conversation
export const UpdateConversation = mutation({
    args: {
        userId: v.id("User"),
        conversationId: v.id("Conversations"),
        name: v.optional(v.string()),
        status: v.optional(statusValidator),
        startedAt: v.optional(v.string()),
        endedAt: v.optional(v.string()),
        transcriptUrl: v.optional(v.string()),
        recordingUrl: v.optional(v.string()),
        summary: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get(args.conversationId);
        if (!existing || existing.userId !== args.userId) {
            throw new Error("Conversation not found");
        }

        const update = {
            updatedAt: new Date().toISOString(),
        };

        if (args.name !== undefined) {
            update.name = args.name;
        }
        if (args.status !== undefined) {
            update.status = args.status;
        }
        if (args.startedAt !== undefined) {
            update.startedAt = args.startedAt;
        }
        if (args.endedAt !== undefined) {
            update.endedAt = args.endedAt;
        }
        if (args.transcriptUrl !== undefined) {
            update.transcriptUrl = args.transcriptUrl;
        }
        if (args.recordingUrl !== undefined) {
            update.recordingUrl = args.recordingUrl;
        }
        if (args.summary !== undefined) {
            update.summary = args.summary;
        }

        await ctx.db.patch(args.conversationId, update);
        return await ctx.db.get(args.conversationId);
    },
});

// Remove a Conversation, scoped to a user
export const RemoveConversation = mutation({
    args: {
        userId: v.id("User"),
        conversationId: v.id("Conversations"),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get(args.conversationId);
        if (!existing || existing.userId !== args.userId) {
            throw new Error("Conversation not found");
        }

        await ctx.db.delete(args.conversationId);
        return existing;
    },
});

// Get details for a single Conversation
export const GetConversationDetails = query({
    args: {
        userId: v.id("User"),
        conversationId: v.id("Conversations"),
    },
    handler: async (ctx, args) => {
        const conversation = await ctx.db.get(args.conversationId);
        if (!conversation || conversation.userId !== args.userId) {
            return null;
        }

        return conversation;
    },
});

// List Conversations for a persona, scoped to a user
export const ListConversationsByPersona = query({
    args: {
        userId: v.id("User"),
        personaId: v.id("Persona"),
    },
    handler: async (ctx, args) => {
        const conversations = await ctx.db
            .query("Conversations")
            .withIndex("by_personaId", (q) => q.eq("personaId", args.personaId))
            .collect();

        return conversations.filter((conversation) => conversation.userId === args.userId);
    },
});

// List Conversations for a user
export const ListConversationsByUser = query({
    args: {
        userId: v.id("User"),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("Conversations")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .collect();
    },
});
