import {
  ChevronRightIcon,
  TrashIcon,
  PencilIcon,
  RefreshCcwIcon,
  FileDownIcon,
  MoreVerticalIcon,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface Props {
  conversationId: string;
  conversationName: string;
  onPrimaryAction: () => void;
  primaryActionLabel?: string;
  primaryActionIcon?: "edit" | "re-evaluate";
  primaryActionDisabled?: boolean;
  onEditName?: () => void;
  onDownloadPdf?: () => void;
  canDownloadPdf?: boolean;
  onRemove: () => void;
}

export const ConversationIdViewHeader = ({
  conversationId,
  conversationName,
  onPrimaryAction,
  primaryActionLabel = "Edit",
  primaryActionIcon = "edit",
  primaryActionDisabled = false,
  onEditName,
  onDownloadPdf,
  canDownloadPdf = false,
  onRemove,
}: Props) => {
  const PrimaryActionIcon =
    primaryActionIcon === "re-evaluate" ? RefreshCcwIcon : PencilIcon;

  return (
    <div className="sticky top-4 z-20 flex items-center justify-between rounded-2xl border border-white/50 bg-transparent px-4 py-3 shadow-sm shadow-primary/5 backdrop-blur-md">
      <Breadcrumb className={undefined}>
        <BreadcrumbList className={undefined}>
          <BreadcrumbItem className={undefined}>
            <BreadcrumbLink
              href="/conversation"
              className="font-medium text-xl"
              render={undefined}
            >
              My Conversations
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="text-foreground text-xl font-medium [&>svg]:size-4">
            <ChevronRightIcon />
          </BreadcrumbSeparator>
          <BreadcrumbItem className={undefined}>
            <BreadcrumbLink
              href={`/conversation/${conversationId}`}
              className="font-medium text-xl text-foreground"
              render={undefined}
            >
              {conversationName}
            </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center gap-2">
        {canDownloadPdf && onDownloadPdf ? (
          <Button type="button" variant="ghost" size="sm" onClick={onDownloadPdf}>
            <FileDownIcon className="size-4" />
            Download PDF
          </Button>
        ) : null}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger
            className={buttonVariants({ variant: "ghost", size: "icon" })}
          >
            <MoreVerticalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className={undefined}>
            <DropdownMenuItem
              onClick={onPrimaryAction}
              disabled={primaryActionDisabled}
              className={undefined}
              inset={undefined}
            >
              <PrimaryActionIcon className="size-4 text-black" />
              {primaryActionLabel}
            </DropdownMenuItem>
            {onEditName ? (
              <DropdownMenuItem onClick={onEditName} className={undefined} inset={undefined}>
                <PencilIcon className="size-4 text-black" />
                Edit name
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onClick={onRemove} className={undefined} inset={undefined}>
              <TrashIcon className="size-4 text-black" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
