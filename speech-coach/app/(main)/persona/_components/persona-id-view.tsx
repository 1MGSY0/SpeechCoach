"use client";

import { useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMutation, usePreloadedQuery, type Preloaded } from "convex/react";

import { api } from "@/convex/_generated/api";
import { PersonaIdViewHeader } from "./persona-id-view-header";

import { GeneratedAvatar } from "@/components/generated-avatar";
import { VideoIcon } from "@phosphor-icons/react/dist/csr/Video";
import { Badge } from "@/components/ui/badge";
import { UserContext } from "@/app/_context/UserContext";
import { RemoveConfirmation } from "./remove-confirmation";
import { UpdatePersonaDialog } from "./update-persona-dialog";
import { Section } from "@/components/ui/display-section";
import { extractPersonaData } from "@/components/extract-persona";

interface Props {
    preloadedPersona: Preloaded<typeof api.Persona.GetPersonaDetails>;
};

export const PersonaIdView = ({ preloadedPersona }: Props) => {
    const personaDetail = usePreloadedQuery(preloadedPersona);
    const router = useRouter();
    const { userData } = useContext(UserContext) ?? {};
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const [updatePersonaDialogOpen, setUpdatePersonaDialogOpen] = useState(false);

    const removePersona = useMutation(api.Persona.RemovePersona);

    const handleRemove = () => {
        setIsDeleteOpen(true);
    };

    const confirmRemove = async () => {
        if (!userData?._id) {
            toast.error("User record not ready yet. Try again.");
            return;
        }

        try {
            setIsDeleting(true);
            await removePersona({
                userId: userData._id,
                personaId: personaDetail._id,
            });
            toast.success("Persona deleted.");
            setIsDeleteOpen(false);
            router.push("/persona");
            router.refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Something went wrong.");
        } finally {
            setIsDeleting(false);
        }
    };
 
    if (!personaDetail) {
        return (
            <div className="flex-1 pb-4 px-4 md:px-8 flex flex-col gap-y-4">
                <p>Persona not found.</p>
            </div>
        );
    }

    const data = extractPersonaData(personaDetail.instructions);


    return (
        <div className="flex-1 pb-4 px-4 md:px-8 flex flex-col gap-y-4">
            <UpdatePersonaDialog
                open={updatePersonaDialogOpen}
                onOpenChange={setUpdatePersonaDialogOpen}
                initialValues={personaDetail}
            />
            <RemoveConfirmation
                open={isDeleteOpen}
                onOpenChange={setIsDeleteOpen}
                onConfirm={confirmRemove}
                isDeleting={isDeleting}
                conversationCount={personaDetail.conversationCount}
            />
            <PersonaIdViewHeader
                personaId={personaDetail._id}
                personaName={personaDetail.name}
                onEdit={() => setUpdatePersonaDialogOpen(true)}
                onRemove={handleRemove}
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
                        <div className="flex flex-col gap-y-5">

                            {!data ? (
                                <p className="text-neutral-800 whitespace-pre-wrap">
                                {personaDetail.instructions}
                                </p>
                            ) : (
                                <div className="space-y-4 text-sm">

                                <Section title="Scenario" content={data.scenario} />

                                <Section title="User Goal" content={data.conversation_goal} />

                                <Section title="Description" content={data.description} />

                                <Section title="Personality" content={data.personality} />

                                <Section title="World Info" content={data.wiAfter} />

                                <Section title="Background / Lore" content={data.wiBefore} />

                                <Section title="Example Message" content={data.mesExamples} />

                                </div>
                            )}
                        </div>
                </div>
            </div>
        </div>
    );
}