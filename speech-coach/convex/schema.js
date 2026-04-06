import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { CONVERSATION_STATUSES } from "../services/conversation-status";

const turnRefValidator = v.object({
    text: v.string(),
    timestamp: v.string(),
});
const turnRefValueValidator = v.union(v.number(), turnRefValidator);

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
        modelPipeline: v.optional(v.union(v.literal("gemini_realtime"), v.literal("gemini_cascade"))),
        voiceGender: v.optional(v.union(v.literal("female"), v.literal("male"))),
        voiceName: v.optional(v.string()),
        semanticMemoryEnabled: v.optional(v.boolean()),
        status: v.union(...CONVERSATION_STATUSES.map((status) => v.literal(status))),
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
        turnRefs: v.optional(v.array(turnRefValueValidator)),
    })
        .index("by_assessmentId", ["assessmentId"])
        .index("by_criterionId", ["criterionId"])
        .index("by_categoryId", ["categoryId"]),
    });
