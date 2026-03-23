"use client";
import { usePreloadedQuery } from "convex/react";
import { DataTable } from "@/components/data-table";
import { columns } from "../../conversation/_components/columns";
import { useRouter } from "next/navigation";

import { useConversationFilters } from "../hooks/use-conversation-filters";
import { DataPagination } from "../../../../components/data-pagination";

export default function ConversationView({ preloadedConversations }) {
  const router = useRouter();
  const data = usePreloadedQuery(preloadedConversations);
  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 0;
  const [filters, setFilters] = useConversationFilters();

  if (items.length === 0) {
    return <div>No conversations found.</div>;
  }

  return (
    <div className="flex-1 pb-4 px-4 md:px-8 flex flex-col gap-y-4">
      <DataTable
        onRowClick={(row) => router.push(`/conversation/${row._id}`)}
        data={items}
        columns={columns}
      />
      <DataPagination
        page={filters.page}
        totalPages={totalPages}
        onPageChange={(page) => setFilters({ page })}
      />
    </div>
  );
}