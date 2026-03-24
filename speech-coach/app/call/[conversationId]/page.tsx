import { api } from '@/convex/_generated/api';
import { getServerContext } from '@/lib/convex_user';
import type { Id } from "@/convex/_generated/dataModel";
import { preloadQuery } from 'convex/nextjs';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { LoadingState } from '@/components/loading-state';
import { CallView } from './_components/call-view';


interface Props {
    params: Promise<{ conversationId: string }>;
}

export default async function Page({ params }: Props) {
    const { convexUserId } = await getServerContext();
    const { conversationId } = (await params) ?? {};

    if (!conversationId || typeof conversationId !== "string") {
          notFound();
      }
    const conversationConvexId = conversationId as Id<"Conversations">;

    const preloadedConversation = await preloadQuery(api.Conversations.GetConversationDetails, {
        userId: convexUserId,
        conversationId: conversationConvexId,
    });


    return (
        <>
            <Suspense fallback={<LoadingState title="Loading..." description="Loading call."/>}>
                <CallView preloadedConversation={preloadedConversation} />
            </Suspense>
        </>
    )
}

