"use client";

import { ColumnDef } from "@tanstack/react-table";
import { CornerDownRightIcon, VideoIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { GeneratedAvatar } from "@/components/generated-avatar";

import { PersonasGetMany } from "../types";
import { extractPersonaData } from "@/components/extract-persona";

export const columns: ColumnDef<PersonasGetMany["items"][number]>[] = [
  {
    accessorKey: "name",
    header: "Persona Name",
    cell: ({ row }) => (
      <div className="flex flex-col gap-y-1">
        <div className="flex items-center gap-x-2">
          <GeneratedAvatar
            variant="botttsNeutral"
            seed={row.original.name}
            className="size-10"
          />
          <span className="font-semibold capitalize">
            {row.original.name}
          </span>
        </div>
        <div className="flex items-center gap-x-2">
          <CornerDownRightIcon className="size-3 text-muted-foreground" />
          <span className="text-sm text-muted-foreground max-w-[200px] truncate capitalize">
            {extractPersonaData(row.original.instructions)?.scenario || row.original.instructions}
          </span>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "conversationCount",
    header: "Conversations",
    cell: ({ row }) => (
      <Badge className="inline-flex w-fit items-center gap-x-3 border-0">
        <VideoIcon className="text-blue-700 size-4" />
        {row.original.conversationCount} {row.original.conversationCount === 1 ? "conversation" : "conversations"}
      </Badge>
    ),
  },
];