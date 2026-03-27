import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { CONVERSATION_STATUSES } from "../services/conversation-status";

export default defineSchema({
    User: defineTable({
        name: v.string(),
        email: v.string(),
    }),

    Persona: defineTable({
        name: v.string(), // Name is required
        userId: v.id("User"), // Foreign key reference to the user table
        instructions: v.string(), // Instructions are required
        updatedAt: v.optional(v.string()), // Store timestamps as strings (ISO format)
    }).index("by_userId", ["userId"]),

    Conversations: defineTable({
        name: v.string(),
        userId: v.id("User"),
        personaId: v.id("Persona"),
        rubricId: v.optional(v.id("AssessmentFramework")),
        status: v.union(...CONVERSATION_STATUSES.map((status) => v.literal(status))),
        startedAt: v.optional(v.string()),
        endedAt: v.optional(v.string()),
        transcriptText: v.optional(v.string()),
        recordingUrl: v.optional(v.string()),
        summary: v.optional(v.string()),
        updatedAt: v.optional(v.string()),
    })
        .index("by_personaId", ["personaId"])
        .index("by_userId", ["userId"])
        .index("by_rubricId", ["rubricId"]),

    AssessmentFramework: defineTable({
        name: v.string(),
        description: v.optional(v.string()),
        isDefault: v.optional(v.boolean()),
        updatedAt: v.optional(v.string()),
    })
        .index("by_name", ["name"])
        .index("by_isDefault", ["isDefault"]),
    
    AssessmentCategory: defineTable({
        frameworkId: v.id("AssessmentFramework"),
        name: v.string(),
        description: v.optional(v.string()),
        order: v.number(),
        weight: v.optional(v.number()),
        scoringMode: v.optional(
        v.union(v.literal("count"), v.literal("score"), v.literal("both"))
        ),
        enabled: v.optional(v.boolean()),
    })
        .index("by_frameworkId", ["frameworkId"]),

    AssessmentCriterion: defineTable({
        frameworkId: v.id("AssessmentFramework"),
        categoryId: v.id("AssessmentCategory"),
        name: v.string(),
        description: v.optional(v.string()),
        order: v.number(),
        weight: v.optional(v.number()),
        enabled: v.optional(v.boolean()),
        targetMin: v.optional(v.number()),
        targetMax: v.optional(v.number()),
        gradingPromptHint: v.optional(v.string()),
        examples: v.optional(v.array(v.string())),
    })
        .index("by_frameworkId", ["frameworkId"])
        .index("by_categoryId", ["categoryId"]),

    ConversationAssessment: defineTable({
        conversationId: v.id("Conversations"),
        frameworkId: v.id("AssessmentFramework"),
        status: v.union(
        v.literal("pending"),
        v.literal("processing"),
        v.literal("completed"),
        v.literal("failed")
        ),
        overallScore: v.optional(v.number()),
        summary: v.optional(v.string()),
        recommendations: v.optional(v.array(v.string())),
        rawModelOutput: v.optional(v.any()),
        createdAt: v.string(),
        updatedAt: v.optional(v.string()),
    })
        .index("by_conversationId", ["conversationId"])
        .index("by_frameworkId", ["frameworkId"]),

    ConversationCriterionResult: defineTable({
        assessmentId: v.id("ConversationAssessment"),
        categoryId: v.id("AssessmentCategory"),
        criterionId: v.id("AssessmentCriterion"),
        count: v.optional(v.number()),
        score: v.optional(v.number()),
        maxScore: v.optional(v.number()),
        feedback: v.optional(v.string()),
        evidence: v.optional(v.array(v.string())),
        turnRefs: v.optional(v.array(v.number())),
    })
        .index("by_assessmentId", ["assessmentId"])
        .index("by_criterionId", ["criterionId"])
        .index("by_categoryId", ["categoryId"]),
    });