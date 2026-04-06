import { api } from '@/convex/_generated/api';
import { getServerContext } from '@/lib/convex_user';
import type { Id } from "@/convex/_generated/dataModel";
import { serverPreloadQuery } from '@/lib/convex-server';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { LoadingState } from '@/components/loading-state';
import { ConversationIdView } from "../_components/conversation-id-view";


interface Props {
    params: Promise<{ conversationId: string }>;
}

export const dynamic = "force-dynamic";

export default async function Page({ params }: Props) {
    const { convexUserId } = await getServerContext();
    const { conversationId } = (await params) ?? {};
    if (!conversationId || typeof conversationId !== "string") {
        redirect("/conversation");
      }
    if (conversationId === "undefined" || conversationId === "null") {
        redirect("/conversation");
    }
    const conversationConvexId = conversationId as Id<"Conversations">;

    const preloadedConversation = await serverPreloadQuery(api.Conversations.GetConversationDetails, {
        userId: convexUserId,
        conversationId: conversationConvexId,
    });

    const preloadedGrading = await serverPreloadQuery(api.ConversationAssessment.GetLatestAssessmentFullByConversationId, {
        conversationId: conversationConvexId,
    });

    return (
        <>
            <Suspense fallback={<LoadingState title="Loading..." description="Loading conversation."/>}>
                <ConversationIdView
                    preloadedConversation={preloadedConversation}
                    preloadedGrading={preloadedGrading}
                    />
            </Suspense>
        </>
    )
}

