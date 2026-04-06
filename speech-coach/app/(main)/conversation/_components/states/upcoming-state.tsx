"use client"

import Link from "next/link"
import { BrainIcon, VideoIcon } from "lucide-react"
import { useState } from "react";
import { toast } from "sonner";
import { useMutation } from "convex/react";

import { Button } from "@/components/ui/button"
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

interface Props {
  conversationId: string;
  userId: string;
  semanticMemoryEnabled?: boolean | null;
/*   onCancelConversation: () => void;
  isCancelling: boolean; */
}


export const UpcomingState = ({ 
    conversationId,
    userId,
    semanticMemoryEnabled,
/*     onCancelConversation,
    isCancelling, */
 }: Props) => {
  const updateConversation = useMutation(api.Conversations.UpdateConversation);
  const [isUpdatingMemory, setIsUpdatingMemory] = useState(false);
  const memoryEnabled = semanticMemoryEnabled !== false;

  const handleToggleMemory = async () => {
    try {
      setIsUpdatingMemory(true);
      await updateConversation({
        userId: userId as Id<"User">,
        conversationId: conversationId as Id<"Conversations">,
        semanticMemoryEnabled: !memoryEnabled,
      });
      toast.success(
        !memoryEnabled
          ? "Rolling semantic memory enabled."
          : "Rolling semantic memory disabled for this conversation."
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update semantic memory setting."
      );
    } finally {
      setIsUpdatingMemory(false);
    }
  };

  return (
    <div className="bg-white rounded-lg px-4 py-5 flex flex-col gap-y-2 ">
        <div className="flex flex-col-reverse lg:flex-row lg:justify-center items-center gap-2 w-full">
    {/*         <Button variant="secondary" className="w-full lg:w-auto" onClick={onCancelConversation} disabled={isCancelling}>
            Cancel conversation
            </Button> */}
            <Link href={`/call/${conversationId}`}>
                <Button /* disabled={isCancelling} */ className="w-full lg:w-auto">
                    <div className="flex items-center gap-x-2">
                        <VideoIcon />
                        Start Conversation
                    </div>
                </Button>
            </Link>
        </div>
        <div className="px-4 py-5 flex flex-col gap-y-2">
            <h3 className="text-base font-medium text-bold">Not Started yet</h3>
            <p className="text-sm text-muted-foreground">
            This conversation is scheduled but has not started yet.
            </p>
            <div className="mt-3 flex flex-col gap-2 rounded-md border border-border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2">
                <BrainIcon className="mt-0.5 size-4 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Rolling semantic memory</p>
                  <p className="text-xs text-muted-foreground">
                    {memoryEnabled
                      ? "Enabled: snapshots update memory and inject it into the agent prompt."
                      : "Disabled: the agent starts without rolling memory and skips memory update events."}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant={memoryEnabled ? "secondary" : "outline"}
                disabled={isUpdatingMemory}
                onClick={handleToggleMemory}
                className="w-full sm:w-auto"
              >
                {memoryEnabled ? "Disable" : "Enable"}
              </Button>
            </div>
        </div>
    </div>
  );
};
