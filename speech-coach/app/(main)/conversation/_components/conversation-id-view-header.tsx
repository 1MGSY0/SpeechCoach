import {
  ChevronRightIcon,
  TrashIcon,
  PencilIcon,
  MoreVerticalIcon,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
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
  onEdit: () => void;
  onRemove: () => void;
}

export const ConversationIdViewHeader = ({
  conversationId,
  conversationName,
  onEdit,
  onRemove,
}: Props) => {
  return (
    <div className="flex items-center justify-between">
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

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          className={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <MoreVerticalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className={undefined}>
          <DropdownMenuItem onClick={onEdit} className={undefined} inset={undefined}>
            <PencilIcon className="size-4 text-black" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onRemove} className={undefined} inset={undefined}>
            <TrashIcon className="size-4 text-black" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
