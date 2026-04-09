"use client";

import { useState } from "react";
import { PlusIcon, XCircleIcon } from "lucide-react";

import { DEFAULT_PAGE } from "@/constants";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

import { NewPersonaDialog } from "./new-persona-dialog";
import { PersonaSearchFilter } from "./persona-search-filter";
import { usePersonaFilters } from "../hooks/use-persona-filters";

export const PersonasListHeader = () => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [filters, setFilters] = usePersonaFilters();
    const isAnyFilterModified = !!filters.search;

    const onClearFilters = () => {
    setFilters({
        search: "",
        page: DEFAULT_PAGE,
    });
    }

  return (
    <>
      <NewPersonaDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
      <div className="py-4 px-4 md:px-8 flex flex-col gap-y-4">
        <div className="flex items-center justify-between">
          <h5 className="font-medium text-xl">My Persona</h5>
          <Button onClick={() => setIsDialogOpen(true)} className={undefined}>
            <PlusIcon />
            New Persona
          </Button>
        </div>
        <ScrollArea className={undefined}>
          <div className="flex items-center gap-x-2 p-1">
            <PersonaSearchFilter />
            {isAnyFilterModified && (
              <Button className={undefined} variant="outline" size="sm" onClick={onClearFilters}>
                <XCircleIcon />
                Clear
              </Button>
            )}
          </div>
          <ScrollBar className={undefined} orientation="horizontal" />
        </ScrollArea>
      </div>
    </>
  );
};