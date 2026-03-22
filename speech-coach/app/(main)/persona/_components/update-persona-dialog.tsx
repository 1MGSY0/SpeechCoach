import { ResponsiveDialog } from "@/components/responsive-dialog";

import { PersonaForm } from "./persona-form";
import { PersonaGetOne } from "../types";

interface UpdatePersonaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues?: PersonaGetOne;
};

export const UpdatePersonaDialog = ({
  open,
  onOpenChange,
  initialValues,
}: UpdatePersonaDialogProps) => {
  return (
    <ResponsiveDialog
      title="Update Persona"
      description="Modify your persona's characteristics, behavior, and more."
      open={open}
      onOpenChange={onOpenChange}
    >
      <PersonaForm
        onSuccess={() => onOpenChange(false)}
        onCancel={() => onOpenChange(false)}
        initialValues={initialValues}
      />
    </ResponsiveDialog>
  );
};