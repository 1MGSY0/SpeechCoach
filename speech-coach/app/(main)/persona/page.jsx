import React, { Suspense } from 'react';
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { stackServerApp } from "@/stack/server";
import PersonaView from "./_components/persona_view";
import { LoadingState } from '@/components/ui/loading-state';

export default async function Page() {
  const user = await stackServerApp.getUser();

  const preloadedPersonas = await preloadQuery(api.Persona.ListPersonas, {
    userId: user.id,
    search: undefined,
  });

  return (
      <PersonaView preloadedPersonas={preloadedPersonas} />
  );
}