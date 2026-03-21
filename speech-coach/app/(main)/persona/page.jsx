import React, { Suspense } from 'react';
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import PersonaView from "./_components/persona_view";
import { LoadingState } from '@/components/loading-state';
import { getServerContext } from "@/lib/convex_user";
import { PersonasListHeader } from "./_components/personalist-header";

export default async function Page() {
  const { convexUserId } = await getServerContext();

  const preloadedPersonas = await preloadQuery(api.Persona.ListPersonas, {
    userId: convexUserId,
    search: undefined,
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