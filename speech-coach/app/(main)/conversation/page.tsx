import React, { Suspense } from 'react'
import { api } from '@/convex/_generated/api';
import { preloadQuery } from 'convex/nextjs';
import { getServerContext } from '@/lib/convex_user';

import ConversationView from './_components/convos-views';
import { LoadingState } from '@/components/loading-state'
import { ConversationListHeader } from './_components/convoslist-header';

const Page = async () => {

    const { convexUserId } = await getServerContext();
    const preloadedConversations = await preloadQuery(api.Conversations.ListConversationsByUser, {
        userId: convexUserId,
    });

  return (
    <>  
        <ConversationListHeader />
        <Suspense fallback={<LoadingState title="Loading..." description="Loading conversations."/>}>
            <ConversationView preloadedConversations={preloadedConversations} />
        </Suspense>
    </>
  )
}

export default Page
