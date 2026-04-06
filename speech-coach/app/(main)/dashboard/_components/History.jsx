"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { DataTable } from "@/components/data-table";
import { columns } from "@/app/(main)/conversation/_components/columns";

function History({ processingItems = [], completedItems = [] }) {
  const router = useRouter();
  const items = [...processingItems, ...completedItems]
    .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))
    .slice(0, 5);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Conversation History</h2>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border bg-background p-6 text-sm text-muted-foreground">
          No processing or completed conversations yet.
        </div>
      ) : (
        <DataTable
          onRowClick={(row) => router.push(`/conversation/${row._id}`)}
          data={items}
          columns={columns}
          variant="cards"
        />
      )}

      <div className="flex justify-end">
        <Link
          href="/conversation"
          className="text-sm font-medium text-primary transition hover:underline"
        >
          ... show full records
        </Link>
      </div>
    </div>
  );
}

export default History;
