"use client";

import { useState } from "react";
import { PlusIcon, XCircleIcon } from "lucide-react";

import { DEFAULT_PAGE } from "@/constants";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

import { NewConversationDialog } from "./new-convo-dialog";
import { ConversationSearchFilter } from "./conversation-search-filter";
import { useConversationFilters } from "../hooks/use-conversation-filters";
import { Status } from "@base-ui/react/autocomplete/index.parts";
import { StatusFilter } from "./status-filter";
import { PersonaFilter } from "./persona-filter";

export const ConversationListHeader = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filters, setFilters] = useConversationFilters();
  const isAnyFilterModified = !!filters.search || !!filters.status || !!filters.personaId;

  const onClearFilters = () => {
    setFilters({
      status: null,
      personaId: "",
      search: "",
      page: DEFAULT_PAGE,
    });
  };

  return (
    <>
      <NewConversationDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
      <div className="py-4 px-4 md:px-8 flex flex-col gap-y-4">
        <div className="flex items-center justify-between">
          <h5 className="font-medium text-xl">My Conversations</h5>
          <Button onClick={() => setIsDialogOpen(true)} className={undefined}>
            <PlusIcon />
            New Conversation
          </Button>
        </div>
        <ScrollArea className={undefined}>
          <div className="flex items-center gap-x-2 p-1">
            <ConversationSearchFilter />
            <StatusFilter />
            <PersonaFilter />
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