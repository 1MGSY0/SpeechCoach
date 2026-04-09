"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMutation, usePreloadedQuery, type Preloaded } from "convex/react";

import { api } from "@/convex/_generated/api";
import { RubricIdViewHeader } from "./rubric-id-view-header";
import { UpdateRubricDialog } from "./update-rubric-dialog";
import { RemoveRubricConfirmation } from "./remove-confirmation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  preloadedRubric: Preloaded<typeof api.AssessmentFramework.GetFrameworkWithStructure>;
}

export const RubricIdView = ({ preloadedRubric }: Props) => {
  const rubricDetail = usePreloadedQuery(preloadedRubric);
  const router = useRouter();

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updateRubricDialogOpen, setUpdateRubricDialogOpen] = useState(false);

  const removeRubric = useMutation(api.AssessmentFramework.DeleteAssessmentFramework);

  const confirmRemove = async () => {
    try {
      setIsDeleting(true);
      await removeRubric({ frameworkId: rubricDetail._id });
      toast.success("Rubric deleted.");
      setIsDeleteOpen(false);
      router.push("/rubric");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!rubricDetail) {
    return (
      <div className="flex-1 pb-4 px-4 md:px-8 flex flex-col gap-y-4">
        <p>Rubric not found.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 pb-4 px-4 md:px-8 flex flex-col gap-y-4">
      <UpdateRubricDialog
        open={updateRubricDialogOpen}
        onOpenChange={setUpdateRubricDialogOpen}
        initialValues={rubricDetail}
      />

      <RemoveRubricConfirmation
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={confirmRemove}
        isDeleting={isDeleting}
      />

      <RubricIdViewHeader
        frameworkId={rubricDetail._id}
        rubricName={rubricDetail.name}
        onEdit={() => setUpdateRubricDialogOpen(true)}
        onRemove={() => setIsDeleteOpen(true)}
      />

      <div className="bg-white rounded-lg">
        <div className="px-4 py-5 gap-y-5 flex flex-col">
          <div className="flex items-center justify-between border-b-5 pb-4">
            <div>
              <h2 className="text-2xl text-primary font-bold">{rubricDetail.name}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {rubricDetail.description || "No description"}
              </p>
            </div>
            <Badge variant="outline" className="rounded-md bg-muted/20 border-muted">
              {rubricDetail.isDefault ? "Default" : "Custom"}
            </Badge>
          </div>

          <div className="space-y-4">
            {rubricDetail.categories?.length ? (
              rubricDetail.categories.map((category) => (
                <Card key={category._id} className="ring-0">
                  <CardHeader className={undefined}>
                    <CardTitle className="flex items-center justify-between text-base">
                      <span>{category.name}</span>
                      <Badge variant="secondary" className={undefined}>
                        {category.scoringMode || "—"}
                      </Badge>
                    </CardTitle>
                    {category.description && (
                      <p className="text-sm text-muted-foreground">
                        {category.description}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {category.criteria?.length ? (
                      category.criteria.map((criterion) => (
                        <div
                          key={criterion._id}
                          className="border rounded-md p-3 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{criterion.name}</span>
                            <Badge variant="outline" className={undefined}>
                              {criterion.enabled ? "Enabled" : "Disabled"}
                            </Badge>
                          </div>
                          {criterion.description && (
                            <p className="text-sm text-muted-foreground">
                              {criterion.description}
                            </p>
                          )}
                          <div className="text-xs text-muted-foreground">
                            Weight: {criterion.weight ?? "—"} | Target Min:{" "}
                            {criterion.targetMin ?? "—"} | Target Max:{" "}
                            {criterion.targetMax ?? "—"}
                          </div>
                          {criterion.gradingPromptHint && (
                            <p className="text-sm">
                              <span className="font-medium">Hint:</span>{" "}
                              {criterion.gradingPromptHint}
                            </p>
                          )}
                          {criterion.examples?.length ? (
                            <div className="text-sm">
                              <span className="font-medium">Examples:</span>
                              <ul className="list-disc ml-5 mt-1">
                                {criterion.examples.map((example, index) => (
                                  <li key={index}>{example}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No criteria in this category.
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No categories in this rubric.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
