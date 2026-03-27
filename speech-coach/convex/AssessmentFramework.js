import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const CreateAssessmentFramework = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
    updatedAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const frameworkId = await ctx.db.insert("AssessmentFramework", {
      name: args.name,
      description: args.description,
      isDefault: args.isDefault,
      updatedAt: args.updatedAt,
    });

    return await ctx.db.get(frameworkId);
  },
});

export const GetAllAssessmentFrameworks = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("AssessmentFramework").collect();
  },
});

export const GetAssessmentFrameworkById = query({
  args: {
    frameworkId: v.id("AssessmentFramework"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.frameworkId);
  },
});

export const UpdateAssessmentFramework = mutation({
  args: {
    frameworkId: v.id("AssessmentFramework"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
    updatedAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.frameworkId);
    if (!existing) throw new Error("Assessment framework not found");

    await ctx.db.patch(args.frameworkId, {
      ...(args.name !== undefined ? { name: args.name } : {}),
      ...(args.description !== undefined ? { description: args.description } : {}),
      ...(args.isDefault !== undefined ? { isDefault: args.isDefault } : {}),
      ...(args.updatedAt !== undefined ? { updatedAt: args.updatedAt } : {}),
    });

    return await ctx.db.get(args.frameworkId);
  },
});

export const DeleteAssessmentFramework = mutation({
  args: {
    frameworkId: v.id("AssessmentFramework"),
  },
  handler: async (ctx, args) => {
    const framework = await ctx.db.get(args.frameworkId);
    if (!framework) throw new Error("Assessment framework not found");

    const categories = await ctx.db
      .query("AssessmentCategory")
      .withIndex("by_frameworkId", (q) => q.eq("frameworkId", args.frameworkId))
      .collect();

    for (const category of categories) {
      const criteria = await ctx.db
        .query("AssessmentCriterion")
        .withIndex("by_categoryId", (q) => q.eq("categoryId", category._id))
        .collect();

      for (const criterion of criteria) {
        await ctx.db.delete(criterion._id);
      }

      await ctx.db.delete(category._id);
    }

    const assessments = await ctx.db
      .query("ConversationAssessment")
      .withIndex("by_frameworkId", (q) => q.eq("frameworkId", args.frameworkId))
      .collect();

    for (const assessment of assessments) {
      const results = await ctx.db
        .query("ConversationCriterionResult")
        .withIndex("by_assessmentId", (q) => q.eq("assessmentId", assessment._id))
        .collect();

      for (const result of results) {
        await ctx.db.delete(result._id);
      }

      await ctx.db.delete(assessment._id);
    }

    await ctx.db.delete(args.frameworkId);

    return { success: true };
  },
});

export const GetFrameworkWithStructure = query({
  args: {
    frameworkId: v.id("AssessmentFramework"),
  },
  handler: async (ctx, args) => {
    const framework = await ctx.db.get(args.frameworkId);
    if (!framework) return null;

    const categories = await ctx.db
      .query("AssessmentCategory")
      .withIndex("by_frameworkId", (q) => q.eq("frameworkId", args.frameworkId))
      .collect();

    const categoriesWithCriteria = await Promise.all(
      categories
        .sort((a, b) => a.order - b.order)
        .map(async (category) => {
          const criteria = await ctx.db
            .query("AssessmentCriterion")
            .withIndex("by_categoryId", (q) => q.eq("categoryId", category._id))
            .collect();

          return {
            ...category,
            criteria: criteria.sort((a, b) => a.order - b.order),
          };
        })
    );

    return {
      ...framework,
      categories: categoriesWithCriteria,
    };
  },
});