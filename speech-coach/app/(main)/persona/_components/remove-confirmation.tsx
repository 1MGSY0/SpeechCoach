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
    conversationCount: number;
}

export const RemoveConfirmation = ({
    open,
    onOpenChange,
    onConfirm,
    isDeleting,
    conversationCount,
}: Props) => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete persona</DialogTitle>
                    <DialogDescription>
                        This will permanently delete this persona and remove{" "}
                        {conversationCount} associated{" "}
                        {conversationCount === 1 ? "conversation" : "conversations"}.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <DialogClose variant="outline" disabled={isDeleting}>
                        Cancel
                    </DialogClose>
                    <Button
                        variant="destructive"
                        onClick={onConfirm}
                        disabled={isDeleting}
                    >
                        {isDeleting ? "Deleting..." : "Delete"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
