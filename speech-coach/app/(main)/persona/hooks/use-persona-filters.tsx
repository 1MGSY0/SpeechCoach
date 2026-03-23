"use client";

import { debounce, parseAsInteger, parseAsString, useQueryStates } from "nuqs";

import { DEFAULT_PAGE, SEARCH_DEBOUNCE } from "@/constants";

export const usePersonaFilters = () => {
  return useQueryStates({
    search: parseAsString.withDefault("").withOptions({ clearOnDefault: true }),
    page: parseAsInteger.withDefault(DEFAULT_PAGE).withOptions({ clearOnDefault: true }),
  },     
  {
      shallow: false,
      limitUrlUpdates: debounce(SEARCH_DEBOUNCE)
  }
  );
};