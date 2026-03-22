import React, { Suspense } from 'react';

import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import type { SearchParams } from "nuqs/server";

import PersonaView from "./_components/persona_view";

import { LoadingState } from '@/components/loading-state';
import { getServerContext } from "@/lib/convex_user";
import { PersonasListHeader } from "./_components/personalist-header";
import { loadSerchParams } from './params';

interface Props {
  searchParams: Promise<SearchParams>;
}

export default async function Page({ searchParams }: Props) {
  const { convexUserId } = await getServerContext();
  const filters = await loadSerchParams(searchParams);

  const preloadedPersonas = await preloadQuery(api.Persona.ListPersonas, {
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