import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const CreateAssessmentCriterion = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const framework = await ctx.db.get(args.frameworkId);
    if (!framework) throw new Error("Assessment framework not found");

    const category = await ctx.db.get(args.categoryId);
    if (!category) throw new Error("Assessment category not found");

    if (category.frameworkId !== args.frameworkId) {
      throw new Error("Category does not belong to the provided framework");
    }

    const criterionId = await ctx.db.insert("AssessmentCriterion", {
      frameworkId: args.frameworkId,
      categoryId: args.categoryId,
      name: args.name,
      description: args.description,
      order: args.order,
      weight: args.weight,
      enabled: args.enabled,
      targetMin: args.targetMin,
      targetMax: args.targetMax,
      gradingPromptHint: args.gradingPromptHint,
      examples: args.examples,
    });

    return await ctx.db.get(criterionId);
  },
});

export const GetCriteriaByCategoryId = query({
  args: {
    categoryId: v.id("AssessmentCategory"),
  },
  handler: async (ctx, args) => {
    const criteria = await ctx.db
      .query("AssessmentCriterion")
      .withIndex("by_categoryId", (q) => q.eq("categoryId", args.categoryId))
      .collect();

    return criteria.sort((a, b) => a.order - b.order);
  },
});

export const UpdateAssessmentCriterion = mutation({
  args: {
    criterionId: v.id("AssessmentCriterion"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    order: v.optional(v.number()),
    weight: v.optional(v.number()),
    enabled: v.optional(v.boolean()),
    targetMin: v.optional(v.number()),
    targetMax: v.optional(v.number()),
    gradingPromptHint: v.optional(v.string()),
    examples: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.criterionId);
    if (!existing) throw new Error("Assessment criterion not found");

    await ctx.db.patch(args.criterionId, {
      ...(args.name !== undefined ? { name: args.name } : {}),
      ...(args.description !== undefined ? { description: args.description } : {}),
      ...(args.order !== undefined ? { order: args.order } : {}),
      ...(args.weight !== undefined ? { weight: args.weight } : {}),
      ...(args.enabled !== undefined ? { enabled: args.enabled } : {}),
      ...(args.targetMin !== undefined ? { targetMin: args.targetMin } : {}),
      ...(args.targetMax !== undefined ? { targetMax: args.targetMax } : {}),
      ...(args.gradingPromptHint !== undefined
        ? { gradingPromptHint: args.gradingPromptHint }
        : {}),
      ...(args.examples !== undefined ? { examples: args.examples } : {}),
    });

    return await ctx.db.get(args.criterionId);
  },
});

export const DeleteAssessmentCriterion = mutation({
  args: {
    criterionId: v.id("AssessmentCriterion"),
  },
  handler: async (ctx, args) => {
    const criterion = await ctx.db.get(args.criterionId);
    if (!criterion) throw new Error("Assessment criterion not found");

    await ctx.db.delete(args.criterionId);

    return { success: true };
  },
});