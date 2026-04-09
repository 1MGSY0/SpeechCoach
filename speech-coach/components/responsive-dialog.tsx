"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";


interface ResponsiveDialogProps {
  title: string;
  description: string;
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentClassName?: string;
};

export const ResponsiveDialog = ({
  title,
  description,
  children,
  open,
  onOpenChange,
  contentClassName,
}: ResponsiveDialogProps) => {

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn("z-50 sm:max-w-lg", contentClassName)}
        overlayClassName="z-40"
        closeButtonClassName={undefined}
      >
        <DialogHeader className="text-left ml-5">
          <DialogTitle className="text-lg font-semibold" >{title}</DialogTitle>
          <DialogDescription className="text-muted-foreground" >
            {description}
          </DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
};
