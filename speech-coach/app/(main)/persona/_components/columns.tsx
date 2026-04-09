"use client";

import { ColumnDef } from "@tanstack/react-table";
import { CornerDownRightIcon, VideoIcon } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { GeneratedAvatar } from "@/components/generated-avatar";

import { PersonasGetMany } from "../types";
import { extractPersonaData } from "@/components/extract-persona";

export const columns: ColumnDef<PersonasGetMany["items"][number]>[] = [
  {
    id: "personaCard",
    header: "",
    cell: ({ row }) => {
      const personaMeta = extractPersonaData(row.original.instructions);
      const scenario = personaMeta?.scenario?.trim() || row.original.instructions;
      const userGoal = personaMeta?.conversation_goal?.trim();

      return (
        <div className="relative h-full w-full overflow-hidden whitespace-normal rounded-[2rem] border border-white/70 bg-gradient-to-br from-white via-white to-sky-50/80 p-5 shadow-sm transition-all hover:shadow-lg">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.14),_transparent_65%)]" />
          <div className="relative grid h-full gap-4">
            <div className="min-w-0 flex flex-col gap-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-x-3">
                  <GeneratedAvatar
                    variant="botttsNeutral"
                    seed={row.original.name}
                    className="size-11"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/75">
                      Persona
                    </p>
                    <span className="block truncate text-lg font-semibold capitalize text-foreground">
                      {row.original.name}
                    </span>
                  </div>
                </div>
                <Badge className="inline-flex w-fit items-center gap-x-2 rounded-sm border border-primary/10 bg-primary/10 px-3 py-1 text-primary shadow-none">
                  <VideoIcon className="size-4" />
                  {row.original.conversationCount}
                </Badge>
              </div>

              <div className="rounded-[1.5rem] border border-white/80 bg-white/80 p-4 backdrop-blur-sm">
                <div className="mb-2 flex items-center gap-x-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary/70">
                  <CornerDownRightIcon className="size-3" />
                  User Goal
                </div>
                <div
                  className={[
                    "grid h-40 gap-2.5",
                    userGoal
                      ? "grid-rows-[minmax(0,1fr)_minmax(0,2fr)]"
                      : "grid-rows-[minmax(0,1fr)]",
                  ].join(" ")}
                >
                  {userGoal ? (
                    <div className="rounded-[1.1rem] border border-white/80 bg-white/70 pl-2 pr-2">
                      <div className="relative h-full overflow-hidden">
                        <p className="mt-0.5 text-xs leading-5 text-slate-600">
                          {userGoal}
                        </p>
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-white via-white/75 to-transparent" />
                      </div>
                    </div>
                  ) : null}
                  <div className="rounded-[1.1rem] border border-white/80 bg-white/70 pl-2 pr-2">
                    <div className="relative h-full overflow-hidden">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary/70">
                        Scenario
                      </p>
                      <p className="mt-0.5 text-xs leading-5 text-slate-600">
                        {scenario}
                      </p>
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-white via-white/75 to-transparent" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <div className="border-b-4 border-primary/20 bg-white/70 px-4 py-3 text-sm text-slate-600 backdrop-blur-sm">
                  Reusable persona context for role-playing
                </div>
                <Link
                  href={`/conversation?personaId=${row.original._id}`}
                  onClick={(event) => event.stopPropagation()}
                  className="inline-flex items-center justify-center rounded-md bg-primary/20 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/30"
                >
                  View conversations
                </Link>
              </div>
            </div>
          </div>
        </div>
      );
    },
  },
];
