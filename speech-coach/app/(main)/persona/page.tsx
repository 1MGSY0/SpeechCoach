import React, { Suspense } from 'react';
import { api } from "@/convex/_generated/api";
import { getServerContext } from "@/lib/convex_user";
import { serverPreloadQuery } from "@/lib/convex-server";

import type { SearchParams } from "nuqs/server";
import { loadSerchParams } from './params';
import PersonaView from "./_components/persona_view";

import { LoadingState } from '@/components/loading-state';
import { PersonasListHeader } from "./_components/personalist-header";

interface Props {
  searchParams: Promise<SearchParams>;
}

export default async function Page({ searchParams }: Props) {
  const { convexUserId } = await getServerContext();
  const filters = await loadSerchParams(searchParams);

  const preloadedPersonas = await serverPreloadQuery(api.Persona.ListPersonas, {
    userId: convexUserId,
    ...filters,
  });

  return (
    <>
      <PersonasListHeader />
        <Suspense fallback={<LoadingState title="Loading..." description="Loading personas."/>}>
          <PersonaView preloadedPersonas={preloadedPersonas} />
        </Suspense>
    </>
  );
}
