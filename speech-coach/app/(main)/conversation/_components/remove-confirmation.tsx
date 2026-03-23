"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

export const RemoveConfirmation = ({
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
}: Props) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={undefined} overlayClassName={undefined} closeButtonClassName={undefined}>
        <DialogHeader className={undefined}>
          <DialogTitle className={undefined}>Delete conversation</DialogTitle>
          <DialogDescription className={undefined}>
            This will permanently delete this conversation.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className={undefined}>
          <DialogClose variant="outline" disabled={isDeleting}>
            Cancel
          </DialogClose>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
            className={undefined}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
