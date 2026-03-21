import { ResponsiveDialog } from "@/components/responsive-dialog";

import { PersonaForm } from "./persona-form";

interface NewPersonaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const NewPersonaDialog = ({
  open,
  onOpenChange,
}: NewPersonaDialogProps) => {
  return (
    <ResponsiveDialog
      title="New Persona"
      description="Create a new persona to get started. You can customize your persona's characteristics, behavior, and more.   "
      open={open}
      onOpenChange={onOpenChange}
    >
      <PersonaForm
        onSuccess={() => onOpenChange(false)}
        onCancel={() => onOpenChange(false)}
      />
    </ResponsiveDialog>
  );
};