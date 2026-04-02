import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const CreateConversationAssessment = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    const framework = await ctx.db.get(args.frameworkId);
    if (!framework) throw new Error("Assessment framework not found");

    const assessmentId = await ctx.db.insert("ConversationAssessment", {
      conversationId: args.conversationId,
      frameworkId: args.frameworkId,
      status: args.status,
      overallScore: args.overallScore,
      summary: args.summary,
      recommendations: args.recommendations,
      rawModelOutput: args.rawModelOutput,
      createdAt: args.createdAt,
      updatedAt: args.updatedAt,
    });

    return await ctx.db.get(assessmentId);
  },
});

export const GetConversationAssessmentById = query({
  args: {
    assessmentId: v.id("ConversationAssessment"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.assessmentId);
  },
});

export const GetAssessmentsByConversationId = query({
  args: {
    conversationId: v.id("Conversations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ConversationAssessment")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
      .collect();
  },
});

export const GetAssessmentsByFrameworkId = query({
  args: {
    frameworkId: v.id("AssessmentFramework"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ConversationAssessment")
      .withIndex("by_frameworkId", (q) => q.eq("frameworkId", args.frameworkId))
      .collect();
  },
});

export const UpdateConversationAssessment = mutation({
  args: {
    assessmentId: v.id("ConversationAssessment"),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("processing"),
        v.literal("completed"),
        v.literal("failed")
      )
    ),
    overallScore: v.optional(v.number()),
    summary: v.optional(v.string()),
    recommendations: v.optional(v.array(v.string())),
    rawModelOutput: v.optional(v.any()),
    updatedAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.assessmentId);
    if (!existing) throw new Error("Conversation assessment not found");

    await ctx.db.patch(args.assessmentId, {
      ...(args.status !== undefined ? { status: args.status } : {}),
      ...(args.overallScore !== undefined ? { overallScore: args.overallScore } : {}),
      ...(args.summary !== undefined ? { summary: args.summary } : {}),
      ...(args.recommendations !== undefined
        ? { recommendations: args.recommendations }
        : {}),
      ...(args.rawModelOutput !== undefined ? { rawModelOutput: args.rawModelOutput } : {}),
      ...(args.updatedAt !== undefined ? { updatedAt: args.updatedAt } : {}),
    });

    return await ctx.db.get(args.assessmentId);
  },
});

export const DeleteConversationAssessment = mutation({
  args: {
    assessmentId: v.id("ConversationAssessment"),
  },
  handler: async (ctx, args) => {
    const assessment = await ctx.db.get(args.assessmentId);
    if (!assessment) throw new Error("Conversation assessment not found");

    const results = await ctx.db
      .query("ConversationCriterionResult")
      .withIndex("by_assessmentId", (q) => q.eq("assessmentId", args.assessmentId))
      .collect();

    for (const result of results) {
      await ctx.db.delete(result._id);
    }

    await ctx.db.delete(args.assessmentId);

    return { success: true };
  },
});

export const GetConversationAssessmentFull = query({
  args: {
    assessmentId: v.id("ConversationAssessment"),
  },
  handler: async (ctx, args) => {
    const assessment = await ctx.db.get(args.assessmentId);
    if (!assessment) return null;

    const framework = await ctx.db.get(assessment.frameworkId);
    const conversation = await ctx.db.get(assessment.conversationId);

    const results = await ctx.db
      .query("ConversationCriterionResult")
      .withIndex("by_assessmentId", (q) => q.eq("assessmentId", args.assessmentId))
      .collect();

    const enrichedResults = await Promise.all(
      results.map(async (result) => {
        const category = await ctx.db.get(result.categoryId);
        const criterion = await ctx.db.get(result.criterionId);

        return {
          ...result,
          category,
          criterion,
        };
      })
    );

    return {
      ...assessment,
      framework,
      conversation,
      results: enrichedResults,
    };
  },
});

export const GetLatestAssessmentFullByConversationId = query({
  args: {
    conversationId: v.id("Conversations"),
  },
  handler: async (ctx, args) => {
    const assessments = await ctx.db
      .query("ConversationAssessment")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    if (assessments.length === 0) return null;

    const latest = assessments
      .sort((a, b) => (b._creationTime ?? 0) - (a._creationTime ?? 0))[0];

    const framework = await ctx.db.get(latest.frameworkId);
    const conversation = await ctx.db.get(latest.conversationId);

    const results = await ctx.db
      .query("ConversationCriterionResult")
      .withIndex("by_assessmentId", (q) => q.eq("assessmentId", latest._id))
      .collect();

    const enrichedResults = await Promise.all(
      results.map(async (result) => {
        const category = await ctx.db.get(result.categoryId);
        const criterion = await ctx.db.get(result.criterionId);

        return {
          ...result,
          category,
          criterion,
        };
      })
    );

    return {
      ...latest,
      framework,
      conversation,
      results: enrichedResults,
    };
  },
});