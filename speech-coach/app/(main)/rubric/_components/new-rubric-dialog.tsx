import { ResponsiveDialog } from "@/components/responsive-dialog";
import { RubricForm } from "./rubric-form";

interface NewRubricDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NewRubricDialog = ({
  open,
  onOpenChange,
}: NewRubricDialogProps) => {
  return (
    <ResponsiveDialog
      title="New Rubric"
      description="Create a new rubric and define its assessment structure."
      open={open}
      onOpenChange={onOpenChange}
      contentClassName="sm:max-w-4xl"
    >
      <RubricForm
        onSuccess={() => onOpenChange(false)}
        onCancel={() => onOpenChange(false)}
      />
    </ResponsiveDialog>
  );
};
