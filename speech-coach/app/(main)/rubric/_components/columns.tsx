"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Layers3Icon, ListChecksIcon } from "lucide-react";
import { RubricsGetMany } from "../types";

type RubricRow = RubricsGetMany[number];

export const columns: ColumnDef<RubricRow>[] = [
  {
    accessorKey: "name",
    header: "Rubric Name",
    cell: ({ row }) => (
      <div className="flex flex-col gap-y-1">
        <span className="font-semibold">{row.original.name}</span>
        <span className="text-sm text-muted-foreground max-w-[260px] truncate">
          {row.original.description || "No description"}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "isDefault",
    header: "Type",
    cell: ({ row }) => (
      <Badge variant="outline" className={undefined}>
        <Layers3Icon className="size-4 mr-1" />
        {row.original.isDefault ? "Default" : "Custom"}
      </Badge>
    ),
  },
  {
    accessorKey: "updatedAt",
    header: "Updated",
    cell: ({ row }) => (
      <Badge variant="secondary" className={undefined}>
        <ListChecksIcon className="size-4 mr-1" />
        {row.original.updatedAt || "—"}
      </Badge>
    ),
  },
];