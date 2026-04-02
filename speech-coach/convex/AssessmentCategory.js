import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const CreateAssessmentCategory = mutation({
  args: {
    frameworkId: v.id("AssessmentFramework"),
    name: v.string(),
    description: v.optional(v.string()),
    order: v.number(),
    weight: v.optional(v.number()),
    scoringMode: v.optional(
      v.union(v.literal("count"), v.literal("score"), v.literal("both"))
    ),
    enabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const framework = await ctx.db.get(args.frameworkId);
    if (!framework) throw new Error("Assessment framework not found");

    const categoryId = await ctx.db.insert("AssessmentCategory", {
      frameworkId: args.frameworkId,
      name: args.name,
      description: args.description,
      order: args.order,
      weight: args.weight,
      scoringMode: args.scoringMode,
      enabled: args.enabled,
    });

    return await ctx.db.get(categoryId);
  },
});

export const GetCategoriesByFrameworkId = query({
  args: {
    frameworkId: v.id("AssessmentFramework"),
  },
  handler: async (ctx, args) => {
    const categories = await ctx.db
      .query("AssessmentCategory")
      .withIndex("by_frameworkId", (q) => q.eq("frameworkId", args.frameworkId))
      .collect();

    return categories.sort((a, b) => a.order - b.order);
  },
});

export const UpdateAssessmentCategory = mutation({
  args: {
    categoryId: v.id("AssessmentCategory"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    order: v.optional(v.number()),
    weight: v.optional(v.number()),
    scoringMode: v.optional(
      v.union(v.literal("count"), v.literal("score"), v.literal("both"))
    ),
    enabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.categoryId);
    if (!existing) throw new Error("Assessment category not found");

    await ctx.db.patch(args.categoryId, {
      ...(args.name !== undefined ? { name: args.name } : {}),
      ...(args.description !== undefined ? { description: args.description } : {}),
      ...(args.order !== undefined ? { order: args.order } : {}),
      ...(args.weight !== undefined ? { weight: args.weight } : {}),
      ...(args.scoringMode !== undefined ? { scoringMode: args.scoringMode } : {}),
      ...(args.enabled !== undefined ? { enabled: args.enabled } : {}),
    });

    return await ctx.db.get(args.categoryId);
  },
});

export const DeleteAssessmentCategory = mutation({
  args: {
    categoryId: v.id("AssessmentCategory"),
  },
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.categoryId);
    if (!category) throw new Error("Assessment category not found");

    const criteria = await ctx.db
      .query("AssessmentCriterion")
      .withIndex("by_categoryId", (q) => q.eq("categoryId", args.categoryId))
      .collect();

    for (const criterion of criteria) {
      await ctx.db.delete(criterion._id);
    }

    await ctx.db.delete(args.categoryId);

    return { success: true };
  },
});