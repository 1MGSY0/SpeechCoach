"use client";

import React from "react";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  useFieldArray,
  useForm,
  type SubmitHandler,
  type UseFormReturn,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

import { RubricCategoryCard } from "./rubric-category-card";

const criterionSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Criterion name is required."),
  description: z.string().optional(),
  order: z.number(),
  weight: z.coerce.number().optional(),
  enabled: z.boolean(),
  targetMin: z.coerce.number().optional(),
  targetMax: z.coerce.number().optional(),
  gradingPromptHint: z.string().optional(),
  examplesText: z.string().optional(),
});

const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Category name is required."),
  description: z.string().optional(),
  order: z.number(),
  weight: z.coerce.number().optional(),
  scoringMode: z.enum(["count", "score", "both"]).optional(),
  enabled: z.boolean(),
  criteria: z.array(criterionSchema),
});

const rubricSchema = z.object({
  name: z.string().min(1, "Rubric name is required."),
  description: z.string().optional(),
  isDefault: z.boolean(),
  categories: z.array(categorySchema),
});

export type RubricFormValues = z.input<typeof rubricSchema>;
export type RubricFormSubmitValues = z.output<typeof rubricSchema>;

interface RubricFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialValues?: any;
}

const fieldLabelClassName =
  "text-sm font-semibold uppercase tracking-[0.14em] text-primary/70";

export const RubricForm = ({
  onSuccess,
  onCancel,
  initialValues,
}: RubricFormProps) => {
  const router = useRouter();

  const createFramework = useMutation(
    api.AssessmentFramework.CreateAssessmentFramework
  );
  const updateFramework = useMutation(
    api.AssessmentFramework.UpdateAssessmentFramework
  );

  const createCategory = useMutation(
    api.AssessmentCategory.CreateAssessmentCategory
  );
  const updateCategory = useMutation(
    api.AssessmentCategory.UpdateAssessmentCategory
  );
  const deleteCategory = useMutation(
    api.AssessmentCategory.DeleteAssessmentCategory
  );

  const createCriterion = useMutation(
    api.AssessmentCriterion.CreateAssessmentCriterion
  );
  const updateCriterion = useMutation(
    api.AssessmentCriterion.UpdateAssessmentCriterion
  );
  const deleteCriterion = useMutation(
    api.AssessmentCriterion.DeleteAssessmentCriterion
  );

  const isEdit = Boolean(initialValues?._id);

  const form = useForm<RubricFormValues, any, RubricFormSubmitValues>({
    resolver: zodResolver(rubricSchema),
    defaultValues: {
      name: initialValues?.name || "",
      description: initialValues?.description || "",
      isDefault: initialValues?.isDefault || false,
      categories:
        initialValues?.categories?.map((category: any, categoryIndex: number) => ({
          id: category._id,
          name: category.name,
          description: category.description || "",
          order: category.order ?? categoryIndex,
          weight: category.weight,
          scoringMode: category.scoringMode,
          enabled: category.enabled ?? true,
          criteria:
            category.criteria?.map((criterion: any, criterionIndex: number) => ({
              id: criterion._id,
              name: criterion.name,
              description: criterion.description || "",
              order: criterion.order ?? criterionIndex,
              weight: criterion.weight,
              enabled: criterion.enabled ?? true,
              targetMin: criterion.targetMin,
              targetMax: criterion.targetMax,
              gradingPromptHint: criterion.gradingPromptHint || "",
              examplesText: criterion.examples?.join("\n") || "",
            })) || [],
        })) || [],
    },
  });

  const {
    fields: categoryFields,
    append: appendCategory,
    remove: removeCategory,
  } = useFieldArray<RubricFormValues, "categories">({
    control: form.control,
    name: "categories",
  });

  const onSubmit: SubmitHandler<RubricFormSubmitValues> = async (values) => {
    try {
      const timestamp = new Date().toISOString();

      let frameworkId: Id<"AssessmentFramework">;

      if (isEdit) {
        await updateFramework({
          frameworkId: initialValues._id,
          name: values.name,
          description: values.description,
          isDefault: values.isDefault,
          updatedAt: timestamp,
        });

        frameworkId = initialValues._id;
      } else {
        const created = await createFramework({
          name: values.name,
          description: values.description,
          isDefault: values.isDefault,
          updatedAt: timestamp,
        });

        frameworkId = created._id;
      }

      const existingCategories = isEdit ? [...(initialValues.categories || [])] : [];

      const submittedCategoryIds = new Set(
        values.categories.map((category) => category.id).filter(Boolean)
      );

      for (const existingCategory of existingCategories) {
        if (!submittedCategoryIds.has(existingCategory._id)) {
          await deleteCategory({
            categoryId: existingCategory._id,
          });
        }
      }

      for (let categoryIndex = 0; categoryIndex < values.categories.length; categoryIndex++) {
        const category = values.categories[categoryIndex];

        let categoryId: Id<"AssessmentCategory">;

        if (category.id) {
          await updateCategory({
            categoryId: category.id as Id<"AssessmentCategory">,
            name: category.name,
            description: category.description,
            order: categoryIndex,
            weight: category.weight,
            scoringMode: category.scoringMode,
            enabled: category.enabled,
          });

          categoryId = category.id as Id<"AssessmentCategory">;
        } else {
          const createdCategory = await createCategory({
            frameworkId,
            name: category.name,
            description: category.description,
            order: categoryIndex,
            weight: category.weight,
            scoringMode: category.scoringMode,
            enabled: category.enabled,
          });

          categoryId = createdCategory._id;
        }

        const existingCriteria = isEdit
          ? [...(existingCategories.find((c) => c._id === category.id)?.criteria || [])]
          : [];

        const submittedCriterionIds = new Set(
          category.criteria.map((criterion) => criterion.id).filter(Boolean)
        );

        for (const existingCriterion of existingCriteria) {
          if (!submittedCriterionIds.has(existingCriterion._id)) {
            await deleteCriterion({
              criterionId: existingCriterion._id,
            });
          }
        }

        for (let criterionIndex = 0; criterionIndex < category.criteria.length; criterionIndex++) {
          const criterion = category.criteria[criterionIndex];

          const payload = {
            name: criterion.name,
            description: criterion.description,
            order: criterionIndex,
            weight: criterion.weight,
            enabled: criterion.enabled,
            targetMin: criterion.targetMin,
            targetMax: criterion.targetMax,
            gradingPromptHint: criterion.gradingPromptHint,
            examples: criterion.examplesText
              ? criterion.examplesText
                  .split("\n")
                  .map((item) => item.trim())
                  .filter(Boolean)
              : undefined,
          };

          if (criterion.id) {
            await updateCriterion({
              criterionId: criterion.id as Id<"AssessmentCriterion">,
              ...payload,
            });
          } else {
            await createCriterion({
              frameworkId,
              categoryId,
              ...payload,
            });
          }
        }
      }

      toast.success(isEdit ? "Rubric updated." : "Rubric created.");
      onSuccess?.();
      router.refresh();

      if (!isEdit) {
        router.push(`/rubric/${frameworkId}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    }
  };

  return (
    <div className="max-h-[85vh] overflow-y-auto pr-2">
      <form className="space-y-6 p-4 md:p-6" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <div className="space-y-4 rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground">Rubric details</h2>
              <p className="text-sm text-muted-foreground">
                Set the rubric name and description before organizing categories and criteria.
              </p>
            </div>
            <div className="space-y-2">
              <label className={fieldLabelClassName}>Rubric Name</label>
              <Input className={undefined} type={undefined} placeholder="e.g. Motivational Interviewing Rubric" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className={fieldLabelClassName}>Description</label>
              <Textarea
                className="min-h-28"
                placeholder="Describe what this rubric evaluates."
                {...form.register("description")}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground">Settings</h2>
              <p className="text-sm text-muted-foreground">
                Choose whether this rubric should be used as the default for new conversations.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/70 bg-white/70 p-4">
              <Checkbox
                checked={form.watch("isDefault")}
                onCheckedChange={(checked) => form.setValue("isDefault", Boolean(checked))} className={undefined}          />
              <div className="space-y-1">
                <p className={fieldLabelClassName}>Default Rubric</p>
                <span className="text-sm text-muted-foreground">Use this rubric as the default option.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground">Categories</h2>
              <p className="text-sm text-muted-foreground">
                Build the scoring structure by grouping criteria into categories.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                appendCategory({
                  id: undefined,
                  name: "",
                  description: "",
                  order: categoryFields.length,
                  weight: undefined,
                  scoringMode: "both",
                  enabled: true,
                  criteria: [],
                })
              }
            >
              Add Category
            </Button>
          </div>

          <div className="space-y-4">
            {categoryFields.map((categoryField, categoryIndex) => (
              <RubricCategoryCard
                key={categoryField.id}
                form={form}
                categoryIndex={categoryIndex}
                onRemove={() => removeCategory(categoryIndex)}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-between gap-x-2 pt-2">
          {onCancel && (
            <Button
              variant="ghost"
              type="button"
              disabled={form.formState.isSubmitting}
              onClick={() => onCancel()}
            >
              Cancel
            </Button>
          )}
          <Button disabled={form.formState.isSubmitting} type="submit">
            {isEdit ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </div>
  );
};
