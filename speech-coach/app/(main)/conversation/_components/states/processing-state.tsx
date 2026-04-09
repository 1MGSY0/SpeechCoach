"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { AlertCircleIcon, LoaderIcon } from "lucide-react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { useReEvaluateConversation } from "../use-re-evaluate-conversation";

interface Props {
  conversationId: string;
}

const LONG_RUNNING_STEP_CREEP: Record<string, number> = {
  "Grading transcript": 14,
  "Generating speaking improvement suggestions": 3,
};

export const ProcessingState = ({ conversationId }: Props) => {
  const conversation = useQuery(api.Conversations.GetConversationById, {
    conversationId: conversationId as Id<"Conversations">,
  });
  const { isSubmitting, handleReEvaluate } = useReEvaluateConversation(conversationId);
  const hasTrackedProgress =
    typeof conversation?.processingProgress === "number" &&
    typeof conversation?.processingStepTitle === "string";
  const processingError =
    typeof conversation?.processingError === "string" && conversation.processingError.trim()
      ? conversation.processingError
      : null;
  const progress = Math.max(0, Math.min(100, conversation?.processingProgress ?? 0));
  const stepTitle = processingError
    ? "The evaluation could not be completed."
    : hasTrackedProgress
    ? conversation?.processingStepTitle ?? "Preparing your evaluation"
    : "Processing in progress";
  const [displayProgress, setDisplayProgress] = useState(progress);
  const displayProgressPercent = Math.round(displayProgress);

  useEffect(() => {
    if (processingError) {
      setDisplayProgress(progress);
      return;
    }

    const creepAllowance = LONG_RUNNING_STEP_CREEP[stepTitle] ?? 0;
    const visualTarget = Math.min(progress + creepAllowance, 99);

    const interval = window.setInterval(() => {
      setDisplayProgress((current) => {
        const baseline = progress;
        const safeCurrent = current < baseline ? baseline : current;

        if (safeCurrent >= visualTarget) {
          return safeCurrent;
        }

        const distance = visualTarget - safeCurrent;
        const increment =
          creepAllowance > 0
            ? Math.max(0.2, distance * 0.08)
            : Math.max(0.35, distance * 0.25);

        return Math.min(visualTarget, Number((safeCurrent + increment).toFixed(2)));
      });
    }, 220);

    return () => window.clearInterval(interval);
  }, [processingError, progress, stepTitle]);

  return (
    <div className="bg-white rounded-lg border">
      <div className="px-4 py-5 grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)] xl:items-start">
        <div className="space-y-4 xl:sticky xl:top-24 xl:self-start xl:h-fit">
          <div>
            <h3 className="text-base font-medium">Practice Completed</h3>
            <p className="text-sm text-muted-foreground">
              Conversation completed. Generating the summary, grading, and speaking feedback.
            </p>
          </div>
          <div className="space-y-3 rounded-lg border bg-muted/10 p-4">
            <div className="flex items-center justify-between text-sm font-medium">
              <span className="inline-flex items-center gap-x-2">
                {processingError ? (
                  <AlertCircleIcon className="size-4 text-red-600" />
                ) : (
                  <LoaderIcon className="size-4 animate-spin text-purple-600" />
                )}
                {processingError ? "Processing failed" : "Processing in progress"}
              </span>
              <span>
                {processingError
                  ? "Error"
                  : hasTrackedProgress
                  ? `${displayProgressPercent}%`
                  : "Running"}
              </span>
            </div>
            <div
              aria-label="Inngest processing progress"
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={hasTrackedProgress ? progress : undefined}
              className="h-3 overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
            >
              {processingError ? (
                <div
                  className="h-full rounded-full bg-red-500 transition-all duration-500 ease-out"
                  style={{ width: `${Math.max(progress, 8)}%` }}
                />
              ) : hasTrackedProgress ? (
                <div
                  className="h-full rounded-full bg-purple-600 transition-all duration-500 ease-out"
                  style={{ width: `${displayProgress}%` }}
                />
              ) : (
                <div className="h-full w-2/3 animate-pulse rounded-full bg-purple-500/80" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">{stepTitle}</p>
            {processingError ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {processingError}
              </div>
            ) : null}
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleReEvaluate}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Re-evaluating..." : "Re-evaluate"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Starting a new evaluation will cancel the current processing run and restart it
                from the latest transcript.
              </p>
            </div>
            {!processingError && !hasTrackedProgress ? (
              <p className="text-xs text-muted-foreground">
                Detailed progress tracking will appear once the Convex backend is updated with the
                new processing fields.
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-lg border border-dashed p-6">
            <h4 className="text-sm font-semibold">Summary</h4>
            <p className="mt-2 text-sm text-muted-foreground">
              The session summary will appear here as soon as processing completes.
            </p>
          </div>
          <div className="rounded-lg border border-dashed p-6">
            <h4 className="text-sm font-semibold">Grading</h4>
            <p className="mt-2 text-sm text-muted-foreground">
              Rubric scoring and speaking feedback will populate here after evaluation finishes.
            </p>
          </div>
          <div className="rounded-lg border border-dashed p-6">
            <h4 className="text-sm font-semibold">Transcript</h4>
            <p className="mt-2 text-sm text-muted-foreground">
              The completed transcript will stay on the right once the conversation is fully processed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
