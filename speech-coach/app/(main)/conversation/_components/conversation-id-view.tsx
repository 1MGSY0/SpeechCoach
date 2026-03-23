"use client";

import { useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMutation, usePreloadedQuery, type Preloaded } from "convex/react";

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

interface Props {
  preloadedConversation: Preloaded<typeof api.Conversations.GetConversationDetails>;
}

export const ConversationIdView = ({ preloadedConversation }: Props) => {
  const conversation = usePreloadedQuery(preloadedConversation);
  const router = useRouter();
  const { userData } = useContext(UserContext) ?? {};
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);

  const removeConversation = useMutation(api.Conversations.RemoveConversation);

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

  return (
    <div className="flex-1 py-4 px-4 md:px-8 flex flex-col gap-y-4">
      <UpdateConversationDialog
        open={updateDialogOpen}
        onOpenChange={setUpdateDialogOpen}
        initialValues={conversation}
      />
      <RemoveConfirmation
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={confirmRemove}
        isDeleting={isDeleting}
      />
      <ConversationIdViewHeader
        conversationId={conversation._id}
        conversationName={conversation.name}
        onEdit={() => setUpdateDialogOpen(true)}
        onRemove={handleRemove}
      />

      <div className="bg-white rounded-lg border">
        <div className="px-4 py-5 flex flex-col gap-y-4">
          <div className="flex items-center gap-x-3">
            <GeneratedAvatar
              variant="botttsNeutral"
              seed={conversation.personaName ?? conversation.name}
              className="size-10"
            />
            <div className="flex flex-col">
              <h2 className="text-2xl font-medium">{conversation.name}</h2>
              {conversation.personaName && (
                <span className="text-sm text-muted-foreground">
                  {conversation.personaName}
                </span>
              )}
            </div>
          </div>
          <Badge variant="outline" className="w-fit capitalize">
            {conversation.status}
          </Badge>
        </div>
      </div>

      {isCancelled && <CancelledState />}
      {isProcessing && <ProcessingState />}
      {isCompleted && <CompletedState data={conversation} />}
      {isActive && <ActiveState conversationId={conversation._id} />}
      {isUpcoming && <UpcomingState />}
    </div>
  );
};