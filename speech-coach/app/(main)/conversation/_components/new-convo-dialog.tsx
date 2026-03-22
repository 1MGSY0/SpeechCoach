import { ResponsiveDialog } from "@/components/responsive-dialog";
import { useRouter } from "next/navigation";

import { ConversationForm } from "./conversation-form";

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const NewConversationDialog = ({
  open,
  onOpenChange,
}: NewConversationDialogProps) => {
  const router = useRouter();
  return (
    <ResponsiveDialog
      title="New Conversation"
      description="Create a new conversation to get started. You can customize your conversation's details, participants, and more."
      open={open}
      onOpenChange={onOpenChange}
    >
      <ConversationForm
        onSuccess={(id) => {
          onOpenChange(false);
          router.push(`/conversations/${id}`);
        }}
        onCancel={() => onOpenChange(false)}
      />
    </ResponsiveDialog>
  );
};