import React from 'react'
import { api } from '@/convex/_generated/api';
import { getServerContext } from '@/lib/convex_user';
import { serverFetchQuery } from '@/lib/convex-server';

import FeatureAssistants from './_components/FeatureAssistants'
import History from './_components/History'
import Feedback from './_components/Feedback'

async function Dashboard() {
  const { convexUserId } = await getServerContext();
  const [processingConversations, completedConversations] = await Promise.all([
    serverFetchQuery(api.Conversations.ListConversations, {
      userId: convexUserId,
      status: "processing",
      page: 1,
      pageSize: 5,
    }),
    serverFetchQuery(api.Conversations.ListConversations, {
      userId: convexUserId,
      status: "completed",
      page: 1,
      pageSize: 5,
    }),
  ]);

  return (
    <div>
      <FeatureAssistants />
        <div className='mt-10'>
          <History
            processingItems={processingConversations?.items ?? []}
            completedItems={completedConversations?.items ?? []}
          />
        </div>
    </div>
  )
}

export default Dashboard
