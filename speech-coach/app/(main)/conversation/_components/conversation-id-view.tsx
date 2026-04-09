"use client";

import { useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMutation, usePreloadedQuery, type Preloaded } from "convex/react";
import { BrainIcon } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { UserContext } from "@/app/_context/UserContext";

import { GeneratedAvatar } from "@/components/generated-avatar";
import { Badge } from "@/components/ui/badge";

import { ConversationIdViewHeader } from "./conversation-id-view-header";
import { RemoveConfirmation } from "./remove-confirmation";
import { UpdateConversationDialog } from "./update-conversation-dialog";
import { ActiveState } from "./states/active-state";
import { UpcomingState } from "./states/upcoming-state";
import { CancelledState } from "./states/cancelled-state";
import { ProcessingState } from "./states/processing-state";
import { CompletedState } from "./states/completed-state";
import { extractPersonaData } from "@/components/extract-persona";
import { useReEvaluateConversation } from "./use-re-evaluate-conversation";
import { exportConversationReportAsPdf } from "./export-conversation-report";

interface Props {
  preloadedConversation: Preloaded<typeof api.Conversations.GetConversationDetails>;
  preloadedGrading: Preloaded<typeof api.ConversationAssessment.GetLatestAssessmentFullByConversationId>;
}

export const ConversationIdView = ({ preloadedConversation, preloadedGrading }: Props) => {
  const conversation = usePreloadedQuery(preloadedConversation);
  const grading = usePreloadedQuery(preloadedGrading);
  const router = useRouter();
  const { userData } = useContext(UserContext) ?? {};
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const { handleReEvaluate, isSubmitting: isReEvaluating } = useReEvaluateConversation(
    conversation?._id ?? ""
  );

  const removeConversation = useMutation(api.Conversations.RemoveConversation);
  const updateConversation = useMutation(api.Conversations.UpdateConversation);

  const handleRemove = () => {
    setIsDeleteOpen(true);
  };

  const confirmRemove = async () => {
    if (!userData?._id) {
      toast.error("User record not ready yet. Try again.");
      return;
    }

    if (!conversation?._id) {
      toast.error("Conversation not available yet.");
      return;
    }

    try {
      setIsDeleting(true);
      await removeConversation({
        userId: userData._id,
        conversationId: conversation._id,
      });
      toast.success("Conversation deleted.");
      setIsDeleteOpen(false);
      router.push("/conversation");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleMemory = async () => {
    try {
      await updateConversation({
        userId: conversation.userId,
        conversationId: conversation._id,
        semanticMemoryEnabled: !semanticMemoryEnabled,
      });
      toast.success(
        !semanticMemoryEnabled
          ? "Rolling semantic memory enabled."
          : "Rolling semantic memory disabled for this conversation."
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update semantic memory setting."
      );
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 pb-4 px-4 md:px-8 flex flex-col gap-y-4">
        <p>Conversation not found.</p>
      </div>
    );
  }

  const isActive = conversation.status === "active";
  const isUpcoming = conversation.status === "upcoming";
  const isCancelled = conversation.status === "cancelled";
  const isCompleted = conversation.status === "completed";
  const isProcessing = conversation.status === "processing";
  const sanitizedGrading = grading
    ? {
        overallScore: grading.overallScore,
        summary: grading.summary,
        recommendations: grading.recommendations,
        framework: grading.framework
          ? {
              name: grading.framework.name,
              description: grading.framework.description,
            }
          : null,
        results: (grading.results ?? []).map((result) => ({
          _id: result._id,
          score: result.score,
          maxScore: result.maxScore,
          count: result.count,
          feedback: result.feedback,
          evidence: result.evidence,
          turnRefs: Array.isArray(result.turnRefs)
            ? result.turnRefs.filter(
                (
                  ref
                ): ref is {
                  text: string;
                  timestamp: string;
                } =>
                  typeof ref === "object" &&
                  ref !== null &&
                  typeof ref.text === "string" &&
                  typeof ref.timestamp === "string"
              )
            : [],
          category: result.category
            ? {
                _id: result.category._id,
                name: result.category.name,
              }
            : null,
          criterion: result.criterion
            ? {
                _id: result.criterion._id,
                name: result.criterion.name,
              }
            : null,
        })),
      }
    : null;
  const primaryActionLabel = isProcessing
    ? "Re-evaluate"
    : isCompleted
      ? "Re-evaluate"
      : "Edit";
  const primaryActionIcon = isCompleted || isProcessing ? "re-evaluate" : "edit";
  const primaryActionDisabled = isReEvaluating;
  const handlePrimaryAction =
    isCompleted || isProcessing ? handleReEvaluate : () => setUpdateDialogOpen(true);
  const semanticMemoryEnabled =
    (conversation as { semanticMemoryEnabled?: boolean | null })
      .semanticMemoryEnabled !== false;
  const reportSummary = semanticMemoryEnabled
    ? conversation.summary || sanitizedGrading?.summary
    : sanitizedGrading?.summary || conversation.summary;

  return (
    <div className="flex-1 py-4 flex flex-col gap-y-4">
      <UpdateConversationDialog
        open={updateDialogOpen}
        onOpenChange={setUpdateDialogOpen}
        initialValues={conversation}
      />
      <UpdateConversationDialog
        open={nameDialogOpen}
        onOpenChange={setNameDialogOpen}
        initialValues={conversation}
        nameOnly
      />
      <RemoveConfirmation
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={confirmRemove}
        isDeleting={isDeleting}
      />
      <div className="relative left-1/2 right-1/2 -mt-[5.5rem] -mx-[50vw] w-screen bg-gradient-to-br from-primary/[0.04] via-slate-100 to-sky-100/20 sm:bg-gradient-to-r sm:from-primary/9 sm:via-slate-100 sm:to-sky-100/45">
        <div className="pointer-events-none absolute -right-20 top-0 h-56 w-56 rounded-full bg-sky-200/20 blur-3xl sm:-right-12 sm:h-72 sm:w-72 sm:bg-sky-200/30" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent via-slate-100/92 to-slate-100 sm:via-slate-100/85" />
        <div className="relative mx-auto w-full max-w-[min(80vw,1600px)] px-4 pb-8 pt-20 sm:px-6 lg:px-8">
          <ConversationIdViewHeader
            conversationId={conversation._id}
            conversationName={conversation.name}
            onPrimaryAction={handlePrimaryAction}
            primaryActionLabel={primaryActionLabel}
            primaryActionIcon={primaryActionIcon}
            primaryActionDisabled={primaryActionDisabled}
            onEditName={
              isCompleted || isProcessing ? () => setNameDialogOpen(true) : undefined
            }
            onDownloadPdf={
              isCompleted
                ? () =>
                    exportConversationReportAsPdf({
                      conversationName: conversation.name,
                      summary: reportSummary,
                      transcript: conversation.transcriptText,
                      gradingData: sanitizedGrading,
                    })
                : undefined
            }
            canDownloadPdf={isCompleted}
            onRemove={handleRemove}
          />
          <div className="mt-2 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] xl:items-start">
            <div className="rounded-3xl border border-white/60 bg-white/85 shadow-sm shadow-primary/5 backdrop-blur xl:sticky xl:top-24 xl:self-start xl:h-fit">
              <div className="px-4 py-5 flex flex-col gap-y-4">
                <div className="flex items-center gap-x-3">
                  <div
                    className="cursor-pointer inline-flex rounded-full transition hover:opacity-80"
                    onClick={() => router.push(`/persona/${conversation.personaId}`)}
                  >
                    <GeneratedAvatar
                      variant="botttsNeutral"
                      seed={conversation.personaName}
                      className="size-10"
                    />
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <h2 className="text-2xl font-medium">{conversation.name}</h2>
                    {conversation.personaName && (
                      <span className="text-sm text-muted-foreground">
                        {conversation.personaName}
                      </span>
                    )}
                  </div>
                </div>
                <Badge variant="outline" className="w-fit border-white/70 bg-white/80 capitalize">
                  {conversation.status}
                </Badge>
                <div className="rounded-xl bg-white/70 p-3">
                  <h2 className="text-base font-semibold uppercase tracking-[0.14em] text-primary/70">
                    Scenario
                  </h2>
                  <div className="text-sm">
                    {extractPersonaData(conversation.instructions)?.scenario || conversation.instructions}
                  </div>
                </div>

                <div className="rounded-xl bg-white/70 p-3">
                  <h2 className="text-base font-semibold uppercase tracking-[0.14em] text-primary/70">
                    User Goal
                  </h2>
                  <div className="text-sm">
                    {extractPersonaData(conversation.instructions)?.conversation_goal || conversation.conversation_goal}
                  </div>
                </div>
                <div className="rounded-xl bg-white/70 p-3">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Rubric
                  </h3>
                  <p className="mt-2 text-sm font-medium">
                    {sanitizedGrading?.framework?.name || "No rubric attached"}
                  </p>
                </div>
                {isUpcoming ? (
                  <div className="rounded-xl bg-white/70 p-3">
                    <div className="flex items-start gap-3">
                      <BrainIcon className="mt-0.5 size-4 text-muted-foreground" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Rolling semantic memory</p>
                            <p className="text-xs text-muted-foreground">
                              {semanticMemoryEnabled
                                ? "Enabled: snapshots update memory and inject it into the agent prompt."
                                : "Disabled: the agent starts without rolling memory and skips memory update events."}
                            </p>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={semanticMemoryEnabled}
                            onClick={handleToggleMemory}
                            className={`rounded-full relative inline-flex h-6 w-11 shrink-0 items-center transition ${
                              semanticMemoryEnabled ? "bg-primary/70" : "bg-slate-300"
                            }`}
                          >
                            <span
                              className={`inline-block size-5 rounded-full bg-white shadow-sm transition ${
                                semanticMemoryEnabled ? "translate-x-5" : "translate-x-1"
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="min-w-0">
              {isCancelled && <CancelledState />}
              {isProcessing && <ProcessingState conversationId={conversation._id} />}
              {isCompleted && <CompletedState data={conversation} gradingData={sanitizedGrading}/>}
              {isActive && <ActiveState conversationId={conversation._id} />}
              {isUpcoming && (
                <UpcomingState
                  conversationId={conversation._id}
                  userId={conversation.userId}
                  rubricId={conversation.rubricId}
                  semanticMemoryEnabled={
                    (conversation as { semanticMemoryEnabled?: boolean | null })
                      .semanticMemoryEnabled
                  }
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
