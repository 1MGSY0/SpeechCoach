import { useContext, useState } from "react";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { UserContext } from "@/app/_context/UserContext";

import { DEFAULT_PAGE } from "@/constants";
import { CommandSelect } from "@/components/command-select";
import { GeneratedAvatar } from "@/components/generated-avatar";

import { useConversationFilters } from "../hooks/use-conversation-filters";

export const PersonaFilter = () => {
  const { userData } = useContext(UserContext) ?? {};
  const [filters, setFilters] = useConversationFilters();
  const [personaSearch, setPersonaSearch] = useState("");

  const hasUser = Boolean(userData?._id);
  const personasResponse = useQuery(
    api.Persona.ListPersonas,
    hasUser
      ? {
          userId: userData._id,
          search: personaSearch,
          pageSize: 100,
          page: DEFAULT_PAGE,
        }
      : "skip"
  );

  const personas = personasResponse?.items ?? [];

  return (
    <CommandSelect
      className="h-9"
      placeholder="Persona"
      options={personas.map((persona) => ({
        id: persona._id,
        value: persona._id,
        children: (
          <div className="flex items-center gap-x-2">
            <GeneratedAvatar
              seed={persona.name}
              variant="botttsNeutral"
              className="size-4"
            />
            {persona.name}
          </div>
        ),
      }))}
      onSelect={(value) =>
        setFilters({
          personaId: value,
          page: DEFAULT_PAGE,
        })
      }
      onSearch={setPersonaSearch}
      value={filters.personaId ?? ""}
    />
  );
};