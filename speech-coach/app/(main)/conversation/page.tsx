import React, { Suspense } from 'react'
import { api } from '@/convex/_generated/api';
import type { Id } from "@/convex/_generated/dataModel";
import { preloadQuery } from 'convex/nextjs';
import { getServerContext } from '@/lib/convex_user';

import type { SearchParams } from "nuqs/server";
import { loadSearchParams } from "./params";

import ConversationView from './_components/convos-views';
import { LoadingState } from '@/components/loading-state'
import { ConversationListHeader } from './_components/convoslist-header';

interface Props {
  searchParams: Promise<SearchParams>;
}

const Page = async ({ searchParams }: Props) => {

    const { convexUserId } = await getServerContext();
    const rawFilters = await loadSearchParams(searchParams);
    const filters = {
    ...rawFilters,
    personaId: rawFilters.personaId
        ? (rawFilters.personaId as Id<"Persona">)
        : undefined,
    status: rawFilters.status || undefined,
    };
    const preloadedConversations = await preloadQuery(api.Conversations.ListConversations, {
        userId: convexUserId,
    ...filters,
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
