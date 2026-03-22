"use client";

import { SearchIcon } from "lucide-react";

import { Input } from "@/components/ui/input";

import { usePersonaFilters } from "../hooks/use-persona-filters";

export const PersonaSearchFilter = () => {
  const [filters, setFilters] = usePersonaFilters();

  return (
    <div className="relative">
      <Input
        placeholder="Filter by name"
        className="h-9 bg-white w-[200px] pl-7 rounded-md"
        value={filters.search}
        onChange={(e) => setFilters({ search: e.target.value })} type={undefined}      />
      <SearchIcon className="size-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
};