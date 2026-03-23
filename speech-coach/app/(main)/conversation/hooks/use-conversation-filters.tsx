"use client";

import {
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
  useQueryStates,
} from "nuqs";

import { DEFAULT_PAGE } from "@/constants";
import { ConversationStatus } from "../types";

export const useConversationFilters = () => {
  return useQueryStates(
    {
      search: parseAsString.withDefault("").withOptions({ clearOnDefault: true }),
      page: parseAsInteger.withDefault(DEFAULT_PAGE).withOptions({ clearOnDefault: true }),
      status: parseAsStringEnum(Object.values(ConversationStatus)),
      personaId: parseAsString.withDefault("").withOptions({ clearOnDefault: true }),
    },
    {
      shallow: false,
    }
  );
};
