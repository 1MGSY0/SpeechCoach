"use client";

import React from "react";
import { useFieldArray, type UseFormReturn, Controller } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import type { RubricFormValues } from "./rubric-form";
import { cn } from "@/lib/utils";

interface RubricCategoryCardProps {
  form: UseFormReturn<RubricFormValues>;
  categoryIndex: number;
  onRemove: () => void;
}

const fieldLabelClassName =
  "text-sm font-semibold uppercase tracking-[0.14em] text-primary/70";

export const RubricCategoryCard = ({
  form,
  categoryIndex,
  onRemove,
}: RubricCategoryCardProps) => {
  const {
    fields: criterionFields,
    append: appendCriterion,
    remove: removeCriterion,
  } = useFieldArray<RubricFormValues, `categories.${number}.criteria`>({
    control: form.control,
    name: `categories.${categoryIndex}.criteria` as const,
  });

  return (
    <Card className="rounded-2xl border-white/70 bg-white/90 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span>Category {categoryIndex + 1}</span>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onRemove}
          >
            Delete Category
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <label className={fieldLabelClassName}>Category Name</label>
            <Input
                      className={undefined} type={undefined} placeholder="Category name"
                      {...form.register(`categories.${categoryIndex}.name`)}        />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className={fieldLabelClassName}>Description</label>
            <Textarea
                      className={undefined} placeholder="Category description"
                      {...form.register(`categories.${categoryIndex}.description`)}        />
          </div>

          <div className="space-y-2">
            <label className={fieldLabelClassName}>Weight</label>
            <Input
                      className={undefined} type="number"
                      step="0.1"
                      placeholder="Weight"
                      {...form.register(`categories.${categoryIndex}.weight`)}        />
          </div>

          <div className="space-y-2">
            <label className={fieldLabelClassName}>Scoring Mode</label>
            <select
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none"
              {...form.register(`categories.${categoryIndex}.scoringMode`)}
            >
              <option value="">Select scoring mode</option>
              <option value="count">Count</option>
              <option value="score">Score</option>
              <option value="both">Both</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-white/70 bg-white/70 p-3">
          <Checkbox
                      checked={form.watch(`categories.${categoryIndex}.enabled`)}
                      onCheckedChange={(checked) => form.setValue(`categories.${categoryIndex}.enabled`, Boolean(checked))} className={undefined}          />
          <span className="text-sm font-medium">Enabled</span>
        </div>

        <div className="space-y-4 rounded-xl border border-white/70 bg-muted/10 p-4">
          <div className="flex items-center justify-between">
            <h4 className={fieldLabelClassName}>Criteria</h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                appendCriterion({
                  id: undefined,
                  name: "",
                  description: "",
                  order: criterionFields.length,
                  weight: undefined,
                  enabled: true,
                  targetMin: undefined,
                  targetMax: undefined,
                  gradingPromptHint: "",
                  examplesText: "",
                })
              }
            >
              Add Criterion
            </Button>
          </div>

          {criterionFields.map((criterionField, criterionIndex) => (
            <div
              key={criterionField.id}
              className="space-y-3 border-2 rounded-md p-3 bg-muted/10"
            >
                <Collapsible>
                <div className="flex flex-col justify-left gap-1">
                    <div className="flex justify-left">
                        <span>Criterion {criterionIndex + 1}</span>
                    </div>

                    <Input
                            type={undefined} className="font-bold"
                            placeholder="Criterion name"
                            {...form.register(
                                `categories.${categoryIndex}.criteria.${criterionIndex}.name`
                            )}                />

                    <Textarea
                            className={undefined} placeholder="Criterion description"
                            {...form.register(
                                `categories.${categoryIndex}.criteria.${criterionIndex}.description`
                            )}                />

                    <CollapsibleContent
                        forceMount
                        className="space-y-3 data-[state=closed]:hidden"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-sm w-10 shrink-0">Weight:</span>
                            <Input
                                          className="w-full" type="number"
                                          step="0.1"
                                          {...form.register(
                                              `categories.${categoryIndex}.criteria.${criterionIndex}.weight`,
                                              {
                                                  setValueAs: (v) => (v === "" ? undefined : Number(v)),
                                              }
                                          )}                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-sm w-10 shrink-0">Min:</span>
                            <Input
                                          className="w-full" type="number"
                                          {...form.register(
                                              `categories.${categoryIndex}.criteria.${criterionIndex}.targetMin`,
                                              {
                                                  setValueAs: (v) => (v === "" ? undefined : Number(v)),
                                              }
                                          )}                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-sm w-10 shrink-0">Max:</span>
                            <Input
                                className="w-full" type="number"
                                {...form.register(
                                    `categories.${categoryIndex}.criteria.${criterionIndex}.targetMax`,
                                    {
                                        setValueAs: (v) => (v === "" ? undefined : Number(v)),
                                    }
                                )}                            />
                        </div>
                        </div>

                        <Textarea
                                className={undefined} placeholder="Grading prompt hint"
                                {...form.register(
                                    `categories.${categoryIndex}.criteria.${criterionIndex}.gradingPromptHint`
                                )}                    />

                        <Textarea
                                className={undefined} placeholder="Examples, one per line"
                                {...form.register(
                                    `categories.${categoryIndex}.criteria.${criterionIndex}.examplesText`
                                )}                    />

                        <div className="flex items-center gap-2">
                        <Controller
                            control={form.control}
                            name={`categories.${categoryIndex}.criteria.${criterionIndex}.enabled`}
                            render={({ field }) => (
                            <Checkbox
                                    checked={field.value ?? true}
                                    onCheckedChange={(checked) => field.onChange(Boolean(checked))} className={undefined}                        />
                            )}
                        />
                        <span className="text-sm">Enabled</span>
                        </div>
                    </CollapsibleContent>
                    
                    <div className="flex flex-row items-center justify-end gap-2">
                        <CollapsibleTrigger
                            className={cn(
                                buttonVariants({ variant: "ghost", size: "sm" }),
                                "underline"
                            )}
                        >
                            Advanced settings
                        </CollapsibleTrigger>
                        
                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removeCriterion(criterionIndex)}
                        >
                            Delete
                        </Button>
                    </div>
                    </div>
                </Collapsible>

            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
