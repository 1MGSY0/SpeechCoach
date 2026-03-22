import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { CONVERSATION_STATUSES } from "../services/conversation-status";

export default defineSchema({
    User: defineTable({
        name: v.string(),
        email: v.string(),
    }),

    ConvoRoom: defineTable({
        persona: v.string(),
        scenario: v.string(),
        conversation: v.optional(v.any()),
    }),
    
    Persona: defineTable({
        name: v.string(), // Name is required
        userId: v.id("User"), // Foreign key reference to the user table
        instructions: v.string(), // Instructions are required
        updatedAt: v.optional(v.string()), // Store timestamps as strings (ISO format)
    }).index("by_userId", ["userId"]),

    Conversations: defineTable({
        name: v.string(), // Name is required
        userId: v.id("User"), // Foreign key reference to the user table
        personaId: v.id("Persona"), // Foreign key reference to the persona table
        status: v.union(...CONVERSATION_STATUSES.map((status) => v.literal(status))), // Enum-like field for meeting status
        startedAt: v.optional(v.string()), // Optional timestamp as a string
        endedAt: v.optional(v.string()), // Optional timestamp as a string
        transcriptUrl: v.optional(v.string()), // Optional URL as a string
        recordingUrl: v.optional(v.string()), // Optional URL as a string
        summary: v.optional(v.string()), // Optional summary as a string
        updatedAt: v.optional(v.string()), // Store timestamps as strings (ISO format)
    })
        .index("by_personaId", ["personaId"])
        .index("by_userId", ["userId"]),
});