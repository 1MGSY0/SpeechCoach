"use client";

import { usePreloadedQuery, type Preloaded } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PersonaIdViewHeader } from "./persona-id-view-header";
import { GeneratedAvatar } from "@/components/generated-avatar";
import { VideoIcon } from "@phosphor-icons/react/dist/csr/Video";
import { Badge } from "@/components/ui/badge";

interface Props {
    preloadedPersona: Preloaded<typeof api.Persona.GetPersonaDetails>;
};

export const PersonaIdView = ({ preloadedPersona }: Props) => {
    const personaDetail = usePreloadedQuery(preloadedPersona);

    return (
        <div className="flex-1 pb-4 px-4 md:px-8 flex flex-col gap-y-4">
            <PersonaIdViewHeader
                personaId={personaDetail._id}
                personaName={personaDetail.name}
                onEdit={() => {}}
                onRemove={() => {}}
            />
            <div className="bg-white rounded-lg border">
                <div className="px-4 py-5 gap-y-5 flex flex-col col-span-5">
                    <div className="flex items-center gap-x-3">
                        <GeneratedAvatar
                            variant="botttsNeutral"
                            seed={personaDetail.name}
                            className="size-10"
                        />
                        <h2 className="text-2xl font-medium">{personaDetail.name}</h2>
                    </div>
                        <Badge
                            variant="outline"
                            className="inline-flex w-fit items-center gap-x-2 [&>svg]:size-4 rounded-md"
                            >
                            <VideoIcon className="text-blue-700" />
                            {personaDetail.conversationCount} {personaDetail.conversationCount === 1 ? "conversation" : "conversations"}
                        </Badge>
                    <div className="flex flex-col gap-y-4">
                        <p className="text-lg font-medium">Instructions</p>
                        <p className="text-neutral-800">{personaDetail.instructions}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}