"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";


interface ResponsiveDialogProps {
  title: string;
  description: string;
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const ResponsiveDialog = ({
  title,
  description,
  children,
  open,
  onOpenChange,
}: ResponsiveDialogProps) => {

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg z-50" overlayClassName="z-40" closeButtonClassName={undefined} >
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