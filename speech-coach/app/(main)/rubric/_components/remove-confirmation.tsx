import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface RemoveRubricConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

export const RemoveRubricConfirmation = ({
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
}: RemoveRubricConfirmationProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className={undefined}>
        <AlertDialogHeader className={undefined}>
          <AlertDialogTitle className={undefined}>Delete rubric?</AlertDialogTitle>
          <AlertDialogDescription className={undefined}>
            This will permanently remove the rubric and its categories and criteria.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className={undefined}>
          <AlertDialogCancel disabled={isDeleting} className={undefined}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={isDeleting} onClick={onConfirm} className={undefined}>
            {isDeleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};