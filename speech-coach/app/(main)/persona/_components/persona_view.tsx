"use client";

import { DataTable } from "@/components/data-table";
import { columns} from "./columns";
import { usePersonaFilters } from "../hooks/use-persona-filters";
import { DataPagination } from "../../../../components/data-pagination";

import { useRouter } from "next/navigation";
import { usePreloadedQuery } from "convex/react";

export default function PersonaView ({ preloadedPersonas }) {
  const router = useRouter();
  const { items: personas, totalPages } = usePreloadedQuery(preloadedPersonas);
  const [filters, setFilters] = usePersonaFilters();

  if (personas.length === 0) {
    return <div>No personas found. Click add persona to create one.</div>;
  }

  return (
    <div className="flex-1 pb-4 px-4 md:px-8 flex flex-col gap-y-4">
        <DataTable 
          onRowClick={(row) => router.push(`/persona/${row._id}`)}
          data={personas} 
          columns={columns}/>
        <DataPagination 
          page={filters.page}
          totalPages={totalPages}
          onPageChange={(page) => setFilters({ page })}
        />
    </div>
    );
}
