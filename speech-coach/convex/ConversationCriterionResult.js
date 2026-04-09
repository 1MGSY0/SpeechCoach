import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const turnRefValidator = v.object({
  text: v.string(),
  timestamp: v.string(),
});
const turnRefValueValidator = v.union(v.number(), turnRefValidator);

export const CreateConversationCriterionResult = mutation({
  args: {
    assessmentId: v.id("ConversationAssessment"),
    categoryId: v.id("AssessmentCategory"),
    criterionId: v.id("AssessmentCriterion"),
    count: v.optional(v.number()),
    score: v.optional(v.number()),
    maxScore: v.optional(v.number()),
    feedback: v.optional(v.string()),
    evidence: v.optional(v.array(v.string())),
    turnRefs: v.optional(v.array(turnRefValueValidator)),
  },
  handler: async (ctx, args) => {
    const assessment = await ctx.db.get(args.assessmentId);
    if (!assessment) throw new Error("Conversation assessment not found");

    const category = await ctx.db.get(args.categoryId);
    if (!category) throw new Error("Assessment category not found");

    const criterion = await ctx.db.get(args.criterionId);
    if (!criterion) throw new Error("Assessment criterion not found");

    if (criterion.categoryId !== args.categoryId) {
      throw new Error("Criterion does not belong to the provided category");
    }

    const resultId = await ctx.db.insert("ConversationCriterionResult", {
      assessmentId: args.assessmentId,
      categoryId: args.categoryId,
      criterionId: args.criterionId,
      count: args.count,
      score: args.score,
      maxScore: args.maxScore,
      feedback: args.feedback,
      evidence: args.evidence,
      turnRefs: args.turnRefs,
    });

    return await ctx.db.get(resultId);
  },
});

export const GetConversationCriterionResultById = query({
  args: {
    resultId: v.id("ConversationCriterionResult"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.resultId);
  },
});

export const GetResultsByAssessmentId = query({
  args: {
    assessmentId: v.id("ConversationAssessment"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ConversationCriterionResult")
      .withIndex("by_assessmentId", (q) => q.eq("assessmentId", args.assessmentId))
      .collect();
  },
});

export const UpdateConversationCriterionResult = mutation({
  args: {
    resultId: v.id("ConversationCriterionResult"),
    count: v.optional(v.number()),
    score: v.optional(v.number()),
    maxScore: v.optional(v.number()),
    feedback: v.optional(v.string()),
    evidence: v.optional(v.array(v.string())),
    turnRefs: v.optional(v.array(turnRefValueValidator)),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.resultId);
    if (!existing) throw new Error("Conversation criterion result not found");

    await ctx.db.patch(args.resultId, {
      ...(args.count !== undefined ? { count: args.count } : {}),
      ...(args.score !== undefined ? { score: args.score } : {}),
      ...(args.maxScore !== undefined ? { maxScore: args.maxScore } : {}),
      ...(args.feedback !== undefined ? { feedback: args.feedback } : {}),
      ...(args.evidence !== undefined ? { evidence: args.evidence } : {}),
      ...(args.turnRefs !== undefined ? { turnRefs: args.turnRefs } : {}),
    });

    return await ctx.db.get(args.resultId);
  },
});

export const DeleteConversationCriterionResult = mutation({
  args: {
    resultId: v.id("ConversationCriterionResult"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.resultId);
    if (!existing) throw new Error("Conversation criterion result not found");

    await ctx.db.delete(args.resultId);

    return { success: true };
  },
});

export const UpsertConversationCriterionResult = mutation({
  args: {
    assessmentId: v.id("ConversationAssessment"),
    categoryId: v.id("AssessmentCategory"),
    criterionId: v.id("AssessmentCriterion"),
    count: v.optional(v.number()),
    score: v.optional(v.number()),
    maxScore: v.optional(v.number()),
    feedback: v.optional(v.string()),
    evidence: v.optional(v.array(v.string())),
    turnRefs: v.optional(v.array(turnRefValueValidator)),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("ConversationCriterionResult")
      .withIndex("by_assessmentId", (q) => q.eq("assessmentId", args.assessmentId))
      .collect();

    const matched = existing.find(
      (item) =>
        item.categoryId === args.categoryId && item.criterionId === args.criterionId
    );

    if (matched) {
      await ctx.db.patch(matched._id, {
        count: args.count,
        score: args.score,
        maxScore: args.maxScore,
        feedback: args.feedback,
        evidence: args.evidence,
        turnRefs: args.turnRefs,
      });

      return await ctx.db.get(matched._id);
    }

    const resultId = await ctx.db.insert("ConversationCriterionResult", {
      assessmentId: args.assessmentId,
      categoryId: args.categoryId,
      criterionId: args.criterionId,
      count: args.count,
      score: args.score,
      maxScore: args.maxScore,
      feedback: args.feedback,
      evidence: args.evidence,
      turnRefs: args.turnRefs,
    });

    return await ctx.db.get(resultId);
  },
});
