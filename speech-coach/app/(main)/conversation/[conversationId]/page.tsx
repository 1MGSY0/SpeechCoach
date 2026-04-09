import { api } from '@/convex/_generated/api';
import { getServerContext } from '@/lib/convex_user';
import type { Id } from "@/convex/_generated/dataModel";
import { serverFetchQuery, serverPreloadQuery } from '@/lib/convex-server';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { LoadingState } from '@/components/loading-state';
import { ConversationIdView } from "../_components/conversation-id-view";


interface Props {
    params: Promise<{ conversationId: string }>;
}

export const dynamic = "force-dynamic";

export default async function Page({ params }: Props) {
    const { conversationId } = (await params) ?? {};

    if (!conversationId || typeof conversationId !== "string") {
        notFound();
    }

    if (conversationId === "undefined" || conversationId === "null") {
        notFound();
    }

    const { convexUserId } = await getServerContext();
    const conversationConvexId = conversationId as Id<"Conversations">;

    const conversation = await serverFetchQuery(api.Conversations.GetConversationDetails, {
        userId: convexUserId,
        conversationId: conversationConvexId,
    });

    if (!conversation) {
        notFound();
    }

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

