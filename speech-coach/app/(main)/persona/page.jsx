import React, { Suspense } from 'react';
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import PersonaView from "./_components/persona_view";
import { LoadingState } from '@/components/loading-state';
import { getServerUserAndConvexUser } from "@/lib/convex_user";

export default async function Page() {
  const { convexUser } = await getServerUserAndConvexUser();

  const preloadedPersonas = await preloadQuery(api.Persona.ListPersonas, {
    userId: convexUser._id,
    search: undefined,
  });

  return (
    <Suspense fallback={<LoadingState title="Loading..." description="Loading personas."/>}>
      <PersonaView preloadedPersonas={preloadedPersonas} />
    </Suspense>
  );
}