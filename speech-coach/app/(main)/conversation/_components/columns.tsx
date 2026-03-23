"use client";

import {format, roundToNearestHours} from "date-fns";
import humanizeDuration from "humanize-duration";
import { ColumnDef } from "@tanstack/react-table";
import {
  CircleCheckIcon,
  CircleXIcon,
  ArrowUpIcon,
  CornerDownRightIcon,
  ClockIcon,
  LoaderIcon,
} from "lucide-react"

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { GeneratedAvatar } from "@/components/generated-avatar";

import { ConversationGetMany } from "../types";

function formatDuration(seconds: number) {
  return humanizeDuration(seconds * 1000, { 
    largest: 1,
    round: true,
    units: ["h", "m", "s"],
  });
}

const statusIconMap = {
  upcoming: ArrowUpIcon,
  active: LoaderIcon,
  completed: CircleCheckIcon,
  processing: LoaderIcon,
  cancelled: CircleXIcon,
};

const statusColorMap = {
  upcoming: "bg-yellow-500/20 text-yellow-800 border-yellow-800/5",
  active: "bg-blue-500/20 text-blue-800 border-blue-800/5",
  completed: "bg-emerald-500/20 text-emerald-800 border-emerald-800/5",
  cancelled: "bg-rose-500/20 text-rose-800 border-rose-800/5",
  processing: "bg-gray-300/20 text-gray-800 border-gray-800/5",
}
export const columns: ColumnDef<ConversationGetMany["items"][number]>[] = [
  {
    accessorKey: "name",
    header: "Conversation",
    cell: ({ row }) => (
      <div className="flex flex-col gap-y-1">
        <span className='text-lg font-semibold capitalize'>{row.original.name}</span>
        <div className="flex items-center gap-x-2">
          <div className="flex items-center gap-x-1">
            <CornerDownRightIcon className="size-3 text-muted-foreground" />
            <GeneratedAvatar
            variant="botttsNeutral"
            seed={row.original.personaName}
            className="size-5"
            />
          </div>
            <span className="text-sm font-bold text-muted-foreground max-w-[200px] truncate capitalize">
              {row.original.personaName}
            </span>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status as keyof typeof statusIconMap;
      const StatusIcon = statusIconMap[status];
      
      return (
        <Badge 
            variant="outline" 
            className={cn(
              "rounded-md capitalize [&>svg]:size-4 text-muted-foreground", 
              statusColorMap[status])}>
          <StatusIcon 
            className={cn("size-4 pr-1", status === "processing" && "animate-spin")}/>
          {row.original.status}
        </Badge>
      );
    },
  },
  { 
    accessorKey: "duration",
    header: "Duration",
    cell: ({ row }) => {
      return (
        <div className="flex flex-col gap-y-1">
          <span className="text-xs text-muted-foreground ">
            {row.original.startedAt ? format(row.original.startedAt, "MMM d") : "-"}
          </span>
          <Badge 
            variant="outline" 
            className="inline-flex w-fit border-0 rounded-md capitalize [&>svg]:size-4 flex items-center gap-x-2">
            <ClockIcon className="size-4 text-muted-foreground" />
            {row.original.duration ? formatDuration(row.original.duration) : "No duration"}
          </Badge>
        </div>

      );
    },
  },
];