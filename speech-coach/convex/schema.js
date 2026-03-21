import { defineSchema, defineTable } from "convex/server";
import {v} from "convex/values";

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
        createdAt: v.string(), // Store timestamps as strings (ISO format)
        updatedAt: v.string(), // Store timestamps as strings (ISO format)
    }),

    Conversations: defineTable({
        name: v.string(), // Name is required
        userId: v.id("User"), // Foreign key reference to the user table
        personaId: v.id("Persona"), // Foreign key reference to the persona table
        status: v.string(), // Enum-like field for meeting status
        startedAt: v.optional(v.string()), // Optional timestamp as a string
        endedAt: v.optional(v.string()), // Optional timestamp as a string
        transcriptUrl: v.optional(v.string()), // Optional URL as a string
        recordingUrl: v.optional(v.string()), // Optional URL as a string
        summary: v.optional(v.string()), // Optional summary as a string
        createdAt: v.string(), // Store timestamps as strings (ISO format)
        updatedAt: v.string(), // Store timestamps as strings (ISO format)
    }),
});