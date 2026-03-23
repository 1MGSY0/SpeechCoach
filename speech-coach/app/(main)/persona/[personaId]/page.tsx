import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getServerContext } from "@/lib/convex_user";

import { Suspense } from "react";
import { LoadingState } from "@/components/loading-state";

import { PersonaIdView } from "../_components/persona-id-view";
import { notFound } from "next/navigation";


interface Props {
    params: Promise<{ personaId: string }>;
}


export default async function Page({ params }: Props) {
    const { personaId } = (await params) ?? {};
    if (!personaId || typeof personaId !== "string") {
        notFound();
    }
    const { convexUserId } = await getServerContext();
    const personaConvexId = personaId as Id<"Persona">;

    const preloadedPersona = await preloadQuery(api.Persona.GetPersonaDetails, {
        userId: convexUserId,
        personaId: personaConvexId,
    });

    console.log("Preloaded persona details:", preloadedPersona);

    return (
        <>
            <Suspense fallback={<LoadingState title="Loading..." description="Loading persona."/>}>
                <PersonaIdView preloadedPersona={preloadedPersona} />
            </Suspense>
        </>
    );

}