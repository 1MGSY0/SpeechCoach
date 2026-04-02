"use client";

import { useRouter } from "next/navigation";
import { usePreloadedQuery } from "convex/react";

import { DataTable } from "@/components/data-table";
import { columns } from "./columns";

export default function RubricView({ preloadedRubrics }) {
  const router = useRouter();
  const rubrics = usePreloadedQuery(preloadedRubrics);

  if (!rubrics || rubrics.length === 0) {
    return (
      <div className="flex-1 pb-4 px-4 md:px-8 flex flex-col gap-y-4">
        <div>No rubrics found. Click new rubric to create one.</div>
      </div>
    );
  }

  return (
    <div className="flex-1 pb-4 px-4 md:px-8 flex flex-col gap-y-4">
      <DataTable
        onRowClick={(row) => router.push(`/rubric/${row._id}`)}
        data={rubrics}
        columns={columns}
      />
    </div>
  );
}