"use client";

import { useContext, useState } from "react";
import type { FormEvent } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { ResponsiveDialog } from "@/components/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { ConversationForm } from "./conversation-form";
import type { ConversationGetOne } from "../types";
import { UserContext } from "@/app/_context/UserContext";
import { api } from "@/convex/_generated/api";

const fieldLabelClassName =
  "text-sm font-semibold uppercase tracking-[0.14em] text-primary/70";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues?: ConversationGetOne;
  nameOnly?: boolean;
}

export const UpdateConversationDialog = ({
  open,
  onOpenChange,
  initialValues,
  nameOnly = false,
}: Props) => {
  return (
    <ResponsiveDialog
      title={nameOnly ? "Edit conversation name" : "Update Conversation"}
      description={
        nameOnly
          ? "Rename this conversation without changing its persona, rubric, or voice."
          : "Modify conversation details."
      }
      open={open}
      onOpenChange={onOpenChange}
    >
      {nameOnly ? (
        <ConversationNameForm
          onSuccess={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
          initialValues={initialValues}
        />
      ) : (
        <ConversationForm
          onSuccess={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
          initialValues={initialValues}
        />
      )}
    </ResponsiveDialog>
  );
};

function ConversationNameForm({
  onSuccess,
  onCancel,
  initialValues,
}: {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialValues?: ConversationGetOne;
}) {
  const { userData } = useContext(UserContext) ?? {};
  const updateConversation = useMutation(api.Conversations.UpdateConversation);
  const [name, setName] = useState(initialValues?.name ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Name is required.");
      return;
    }

    if (!userData?._id || !initialValues?._id) {
      toast.error("Conversation is not ready yet. Try again.");
      return;
    }

    try {
      setIsSubmitting(true);
      await updateConversation({
        userId: userData._id,
        conversationId: initialValues._id,
        name: trimmedName,
      });
      toast.success("Conversation name updated.");
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-4 p-4" onSubmit={handleSubmit}>
      <div className="space-y-1">
        <label className={fieldLabelClassName} htmlFor="conversation-name-only">
          Name
        </label>
        <Input
          className={undefined}
          id="conversation-name-only"
          type="text"
          placeholder="e.g. Week 1 coaching"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      <div className="flex justify-between gap-x-2">
        {onCancel && (
          <Button
            variant="ghost"
            type="button"
            disabled={isSubmitting}
            onClick={() => onCancel()}
          >
            Cancel
          </Button>
        )}
        <Button disabled={isSubmitting} type="submit">
          Save
        </Button>
      </div>
    </form>
  );
}
