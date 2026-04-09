import React from 'react'
import { api } from '@/convex/_generated/api';
import { getServerContext } from '@/lib/convex_user';
import { serverFetchQuery } from '@/lib/convex-server';

import FeatureAssistants, { DashboardIntro } from './_components/FeatureAssistants'
import History from './_components/History'

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
    <div className="grid min-w-0 gap-12 lg:gap-14">
      <div className="relative left-1/2 right-1/2 -mt-[4.5rem] -mx-[50vw] w-screen overflow-hidden bg-gradient-to-br from-primary/[0.04] via-slate-100 to-sky-100/20 sm:bg-gradient-to-r sm:from-primary/9 sm:via-slate-100 sm:to-sky-100/45">
        <div className="pointer-events-none absolute -right-20 top-0 h-56 w-56 rounded-full bg-sky-200/25 blur-3xl sm:-right-12 sm:h-72 sm:w-72 sm:bg-sky-200/35" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent via-slate-100/92 to-slate-100 sm:via-slate-100/85" />
        <div className="relative mx-auto w-full max-w-[min(80vw,1600px)] min-w-0 px-4 pb-10 pt-20 sm:px-6 lg:px-8">
          <DashboardIntro />
          <div className="min-w-0 pt-10">
            <FeatureAssistants showIntro={false} />
          </div>
        </div>
      </div>
      <div className="min-w-0 pt-2">
        <History
          processingItems={processingConversations?.items ?? []}
          completedItems={completedConversations?.items ?? []}
        />
      </div>
    </div>
  )
}

export default Dashboard
