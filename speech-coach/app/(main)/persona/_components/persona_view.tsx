"use client";

import React from "react";
import { usePreloadedQuery } from "convex/react";
import { DataTable } from "./data-table";
import { columns} from "./columns";
import { usePersonaFilters } from "../hooks/use-persona-filters";
import { DataPagination } from "./data-pagination";


export default function PersonaView ({ preloadedPersonas }) {
  const { items: personas, totalPages } = usePreloadedQuery(preloadedPersonas);
  const [filters, setFilters] = usePersonaFilters();

  if (personas.length === 0) {
    return <div>No personas found. Click add persona to create one.</div>;
  }

  return (
    <div className="flex-1 pb-4 px-4 md:px-8 flex flex-col gap-y-4">
        <DataTable data={personas} columns={columns}/>
              <DataPagination 
                page={filters.page}
                totalPages={totalPages}
                onPageChange={(page) => setFilters({ page })}
              />
    </div>
    );
}
