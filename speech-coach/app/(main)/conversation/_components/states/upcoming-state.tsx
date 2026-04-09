"use client"

import Link from "next/link"
import { VideoIcon } from "lucide-react"
import { useQuery } from "convex/react";

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

interface Props {
  conversationId: string;
  userId: string;
  rubricId?: string | null;
  semanticMemoryEnabled?: boolean | null;
/*   onCancelConversation: () => void;
  isCancelling: boolean; */
}


export const UpcomingState = ({ 
    conversationId,
    rubricId,
/*     onCancelConversation,
    isCancelling, */
 }: Props) => {
  const rubric = useQuery(
    api.AssessmentFramework.GetFrameworkWithStructure,
    rubricId
      ? { frameworkId: rubricId as Id<"AssessmentFramework"> }
      : "skip"
  );

  return (
    <div className="bg-white rounded-lg px-4 py-5 grid gap-4">
        <div className="space-y-4 xl:sticky xl:top-24 xl:self-start xl:h-fit">
              <div className="rounded-lg p-4 text-center">
                <h3 className="text-base font-medium text-bold">Not Started yet</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  This conversation is scheduled but has not started yet.
                </p>
            </div>
            <div className="flex flex-col-reverse lg:flex-row lg:justify-center items-center gap-2 w-full rounded-lg p-4">
                <Link href={`/call/${conversationId}`}>
                    <Button /* disabled={isCancelling} */ className="w-full lg:w-auto">
                        <div className="flex items-center gap-x-2">
                            <VideoIcon />
                            Start Conversation
                        </div>
                    </Button>
                </Link>
            </div>

            <div className="space-y-5 border-t-5 pt-5 items-center justified-center">
              <div>
                <h4 className="text-md font-bold">Rubric</h4>
                <p className="text-xs text-muted-foreground">
                  Review the scoring criteria that will be used for this conversation.
                </p>
              </div>

              {!rubricId ? (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  No rubric is attached to this conversation.
                </div>
              ) : rubric === undefined ? (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  Loading rubric content...
                </div>
              ) : !rubric ? (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  Rubric details could not be loaded.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-md border bg-muted/20 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">{rubric.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {rubric.description || "No rubric description available."}
                        </p>
                      </div>
                      <Badge variant="outline" className={undefined}>
                        {rubric.isDefault ? "Default" : "Custom"}
                      </Badge>
                    </div>
                  </div>

                  {rubric.categories?.length ? (
                    rubric.categories.map((category) => (
                      <Card key={category._id} className={undefined}>
                        <CardHeader className={undefined}>
                          <CardTitle className="flex items-center justify-between gap-2 text-base">
                            <span>{category.name}</span>
                            <Badge variant="secondary" className={undefined}>
                              {category.scoringMode || "Not set"}
                            </Badge>
                          </CardTitle>
                          {category.description ? (
                            <p className="text-sm text-muted-foreground">
                              {category.description}
                            </p>
                          ) : null}
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {category.criteria?.length ? (
                            category.criteria.map((criterion) => (
                              <div
                                key={criterion._id}
                                className="space-y-2 rounded-md border p-3"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-sm font-medium">{criterion.name}</p>
                                  <Badge variant="outline" className={undefined}>
                                    {criterion.enabled ? "Enabled" : "Disabled"}
                                  </Badge>
                                </div>
                                {criterion.description ? (
                                  <p className="text-sm text-muted-foreground">
                                    {criterion.description}
                                  </p>
                                ) : null}
                                <p className="text-xs text-muted-foreground">
                                  Weight: {criterion.weight ?? "Not set"} | Target Min:{" "}
                                  {criterion.targetMin ?? "Not set"} | Target Max:{" "}
                                  {criterion.targetMax ?? "Not set"}
                                </p>
                                {criterion.gradingPromptHint ? (
                                  <p className="text-sm">
                                    <span className="font-medium">Hint:</span>{" "}
                                    {criterion.gradingPromptHint}
                                  </p>
                                ) : null}
                                {criterion.examples?.length ? (
                                  <div className="space-y-1">
                                    <p className="text-sm font-medium">Examples</p>
                                    <ul className="list-disc pl-5 text-sm text-muted-foreground">
                                      {criterion.examples.map((example, index) => (
                                        <li key={`${criterion._id}-${index}`}>{example}</li>
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
                    <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                      No categories in this rubric.
                    </div>
                  )}
                </div>
              )}
            </div>
        </div>
    </div>
  );
};
