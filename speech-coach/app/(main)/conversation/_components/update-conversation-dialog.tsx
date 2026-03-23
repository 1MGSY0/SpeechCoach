import { ResponsiveDialog } from "@/components/responsive-dialog";

import { ConversationForm } from "./conversation-form";
import type { ConversationGetOne } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues?: ConversationGetOne;
}

export const UpdateConversationDialog = ({
  open,
  onOpenChange,
  initialValues,
}: Props) => {
  return (
    <ResponsiveDialog
      title="Update Conversation"
      description="Modify conversation details."
      open={open}
      onOpenChange={onOpenChange}
    >
      <ConversationForm
        onSuccess={() => onOpenChange(false)}
        onCancel={() => onOpenChange(false)}
        initialValues={initialValues}
      />
    </ResponsiveDialog>
  );
};
