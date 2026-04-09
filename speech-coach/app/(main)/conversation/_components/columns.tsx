"use client";

import {format} from "date-fns";
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
    id: "conversationCard",
    header: "",
    cell: ({ row }) => {
      const original = row.original as typeof row.original & {
        rubricName?: string | null;
        latestOverallScore?: number | null;
      };
      const status = row.original.status as keyof typeof statusIconMap;
      const StatusIcon = statusIconMap[status];

      return (
        <div className="relative h-full w-full overflow-hidden whitespace-normal rounded-[1.6rem] border border-white/70 bg-gradient-to-br from-white via-white to-sky-50/80 p-4 shadow-sm transition-all hover:shadow-lg">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.14),_transparent_65%)]" />
          <div className="relative grid h-full gap-3.5">
            <div className="min-w-0 flex flex-col gap-y-3">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/75">
                    Recent Practice
                  </p>
                  <div className="relative min-w-0">
                    <span className="block overflow-hidden whitespace-nowrap pr-8 text-lg font-semibold capitalize text-foreground [mask-image:linear-gradient(to_right,black_0%,black_78%,transparent_100%)]">
                      {row.original.name}
                    </span>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0 self-start rounded-full border px-2.5 py-1 text-xs capitalize [&>svg]:size-3.5",
                    statusColorMap[status]
                  )}
                >
                  <StatusIcon className={cn("size-3", status === "processing" && "animate-spin")} />
                  <p className="pl-2">{row.original.status}</p>
                </Badge>
              </div>
              <div className="rounded-[1.2rem] border border-white/80 bg-white/80 p-3 backdrop-blur-sm">
                <div className="mb-2 flex items-center gap-x-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/70">
                  <CornerDownRightIcon className="size-3 text-muted-foreground" />
                  Persona
                </div>
                <div className="flex items-center gap-x-3">
                  <GeneratedAvatar
                    variant="botttsNeutral"
                    seed={row.original.personaName}
                    className="size-7"
                  />
                  <span className="max-w-[220px] truncate text-sm font-medium capitalize text-slate-700">
                    {row.original.personaName}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[1.2rem] border border-white/80 bg-white/80 p-3 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/70">
                  Rubric
                </p>
                <p className="mt-2 text-sm font-medium leading-5 text-slate-700">
                  {original.rubricName || "No rubric attached"}
                </p>
              </div>
              <div className="rounded-[1.2rem] border border-white/80 bg-white/80 p-3 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/70">
                  Overall Score
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {original.latestOverallScore != null ? `${original.latestOverallScore} / 10` : "Not graded yet"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1rem] border border-white/80 bg-white/70 px-3 py-2 text-xs text-slate-600 backdrop-blur-sm">
              <span className="font-medium">
                {row.original.startedAt ? format(row.original.startedAt, "MMM d") : "-"}
              </span>
              <Badge
                variant="outline"
                className="inline-flex w-fit rounded-full border-0 bg-primary/10 px-2.5 py-1 capitalize text-primary [&>svg]:size-3.5 flex items-center gap-x-1.5"
              >
                <ClockIcon className="size-3.5 text-primary" />
                {row.original.durationSeconds != null ? formatDuration(row.original.durationSeconds) : "No duration"}
              </Badge>
            </div>
          </div>
        </div>
      );
    },
  },
];
