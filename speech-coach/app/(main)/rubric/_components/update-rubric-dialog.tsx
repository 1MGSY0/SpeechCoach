import { ResponsiveDialog } from "@/components/responsive-dialog";
import { RubricForm } from "./rubric-form";

interface UpdateRubricDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues: any;
}

export const UpdateRubricDialog = ({
  open,
  onOpenChange,
  initialValues,
}: UpdateRubricDialogProps) => {
  return (
    <ResponsiveDialog
      title="Update Rubric"
      description="Edit the rubric structure and settings."
      open={open}
      onOpenChange={onOpenChange}
    >
      <RubricForm
        initialValues={initialValues}
        onSuccess={() => onOpenChange(false)}
        onCancel={() => onOpenChange(false)}
      />
    </ResponsiveDialog>
  );
};