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
        rubricId: v.optional(v.id("AssessmentFramework")),
        modelPipeline: v.optional(v.union(v.literal("gemini_realtime"), v.literal("gemini_cascade"))),
        voiceGender: v.optional(v.union(v.literal("female"), v.literal("male"))),
        voiceName: v.optional(v.string()),
        semanticMemoryEnabled: v.optional(v.boolean()),
        name: v.string(),
        status: v.optional(statusValidator),
        processingProgress: v.optional(v.number()),
        processingStepTitle: v.optional(v.string()),
        processingError: v.optional(v.union(v.string(), v.null())),
        startedAt: v.optional(v.string()),
        endedAt: v.optional(v.string()),
        transcriptText: v.optional(v.string()),
        recordingUrl: v.optional(v.string()),
        summary: v.optional(v.string()),
        speechMetrics: v.optional(v.any()),
        memoryMetrics: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        const now = new Date().toISOString();

        const conversationId = await ctx.db.insert("Conversations", {
            name: args.name,
            userId: args.userId,
            personaId: args.personaId,
            status: args.status ?? "upcoming",
            processingProgress: args.processingProgress,
            processingStepTitle: args.processingStepTitle,
            processingError: args.processingError,
            startedAt: args.startedAt,
            endedAt: args.endedAt,
            transcriptText: args.transcriptText,
            recordingUrl: args.recordingUrl,
            summary: args.summary,
            speechMetrics: args.speechMetrics,
            memoryMetrics: args.memoryMetrics,
            updatedAt: now,
            rubricId: args.rubricId,
            modelPipeline: args.modelPipeline,
            voiceGender: args.voiceGender,
            voiceName: args.voiceName,
            semanticMemoryEnabled: args.semanticMemoryEnabled ?? true,
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
        rubricId: v.optional(v.id("AssessmentFramework")),
        modelPipeline: v.optional(v.union(v.literal("gemini_realtime"), v.literal("gemini_cascade"))),
        voiceGender: v.optional(v.union(v.literal("female"), v.literal("male"))),
        voiceName: v.optional(v.string()),
        semanticMemoryEnabled: v.optional(v.boolean()),
        name: v.optional(v.string()),
        status: v.optional(statusValidator),
        processingProgress: v.optional(v.number()),
        processingStepTitle: v.optional(v.string()),
        processingError: v.optional(v.union(v.string(), v.null())),
        startedAt: v.optional(v.string()),
        endedAt: v.optional(v.string()),
        transcriptText: v.optional(v.string()),
        recordingUrl: v.optional(v.string()),
        summary: v.optional(v.string()),
        speechMetrics: v.optional(v.any()),
        memoryMetrics: v.optional(v.any()),
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
        if (args.rubricId !== undefined) {
            update.rubricId = args.rubricId;
        }
        if (args.modelPipeline !== undefined) {
            update.modelPipeline = args.modelPipeline;
        }
        if (args.voiceGender !== undefined) {
            update.voiceGender = args.voiceGender;
        }
        if (args.voiceName !== undefined) {
            update.voiceName = args.voiceName;
        }
        if (args.semanticMemoryEnabled !== undefined) {
            update.semanticMemoryEnabled = args.semanticMemoryEnabled;
        }

        if (args.status !== undefined) {
            update.status = args.status;
        }
        if (args.processingProgress !== undefined) {
            update.processingProgress = args.processingProgress;
        }
        if (args.processingStepTitle !== undefined) {
            update.processingStepTitle = args.processingStepTitle;
        }
        if (args.processingError !== undefined) {
            update.processingError = args.processingError;
        }
        if (args.startedAt !== undefined) {
            update.startedAt = args.startedAt;
        }
        if (args.endedAt !== undefined) {
            update.endedAt = args.endedAt;
        }
        if (args.transcriptText !== undefined) {
            update.transcriptText = args.transcriptText;
        }
        if (args.recordingUrl !== undefined) {
            update.recordingUrl = args.recordingUrl;
        }
        if (args.summary !== undefined) {
            update.summary = args.summary;
        }
        if (args.speechMetrics !== undefined) {
            update.speechMetrics = args.speechMetrics;
        }
        if (args.memoryMetrics !== undefined) {
            update.memoryMetrics = args.memoryMetrics;
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
    const user = conversation?.userId ? await ctx.db.get(conversation.userId) : null;

    const persona = await ctx.db.get(conversation.personaId);
    return {
        ...conversation,
        personaName: persona?.name ?? null, 
        instructions: persona?.instructions ?? null, 
        userName: user?.name ?? null,
    };
};

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

export const GetConversationById = query({
  args: {
    conversationId: v.id("Conversations"),
  },
    handler: async (ctx, args) => {
        const conversation = await ctx.db.get(args.conversationId);

        const withDurationResult = withDuration(conversation);
        return await withPersonaName(ctx, withDurationResult);
    },
});


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
