import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import {
    DEFAULT_PAGE,
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
    MIN_PAGE_SIZE,
} from "../constants";
import { ConversationStatus } from "../services/conversation-status";
import { api } from "./_generated/api";

const statusValidator = v.union(
    ...Object.values(ConversationStatus).map((status) => v.literal(status))
);

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

        await ctx.scheduler.runAfter(0, api.conversations_stream.setupStreamForConversation, {
            userId: args.userId,
            personaId: args.personaId,
            conversationId,
            name: args.name,
        });

        return conversationId;
    },
});

// Update an existing Conversation
export const UpdateConversation = mutation({
    args: {
        userId: v.id("User"),
        conversationId: v.id("Conversations"),
        personaId: v.optional(v.id("Persona")),
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
        if (args.personaId !== undefined) {
            update.personaId = args.personaId;
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

        const withDurationResult = withDuration(conversation);
        return await withPersonaName(ctx, withDurationResult);
    },
});

const withDuration = (conversation) => {
    if (!conversation?.startedAt || !conversation?.endedAt) {
        return { ...conversation, durationSeconds: 0 };
    }

    const startMs = Date.parse(conversation.startedAt);
    const endMs = Date.parse(conversation.endedAt);

    if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
        return { ...conversation, durationSeconds: 0 };
    }

    const durationMs = Math.max(0, endMs - startMs);
    return { ...conversation, durationSeconds: Math.floor(durationMs / 1000) };
};

const withPersonaName = async (ctx, conversation) => {
    if (!conversation?.personaId) {
        return { ...conversation, personaName: null };
    }

    const persona = await ctx.db.get(conversation.personaId);
    return { ...conversation, personaName: persona?.name ?? null };
};

// List Conversations for a user, optionally filtered by persona
export const ListConversations = query({
    args: {
        userId: v.id("User"),
        personaId: v.optional(v.id("Persona")),
        page: v.optional(v.number()),
        pageSize: v.optional(v.number()),
        search: v.optional(v.string()),
        status: v.optional(statusValidator),
    },
    handler: async (ctx, args) => {
        const page = args.page ?? DEFAULT_PAGE;
        const rawPageSize = args.pageSize ?? DEFAULT_PAGE_SIZE;
        const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(MIN_PAGE_SIZE, rawPageSize));
        const search = args.search?.trim().toLowerCase();
        const hasSearch = Boolean(search);

        const conversations = args.personaId
            ? await ctx.db
                  .query("Conversations")
                  .withIndex("by_personaId", (q) => q.eq("personaId", args.personaId))
                  .collect()
            : await ctx.db
                  .query("Conversations")
                  .withIndex("by_userId", (q) => q.eq("userId", args.userId))
                  .collect();

        const filtered = conversations.filter((conversation) => {
            if (conversation.userId !== args.userId) {
                return false;
            }
            if (args.personaId && conversation.personaId !== args.personaId) {
                return false;
            }
            if (args.status && conversation.status !== args.status) {
                return false;
            }
            if (hasSearch && !conversation.name.toLowerCase().includes(search)) {
                return false;
            }
            return true;
        });

        filtered.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));

        const total = filtered.length;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        const safePage = Math.max(1, Math.min(page, totalPages));
        const start = (safePage - 1) * pageSize;
        const pageItems = filtered.slice(start, start + pageSize);
        const itemsWithDuration = pageItems.map(withDuration);
        const items = await Promise.all(
            itemsWithDuration.map((conversation) => withPersonaName(ctx, conversation))
        );

        return {
            items,
            total,
            totalPages,
        };
    },
});
