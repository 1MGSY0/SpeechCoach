"use client";

import { api } from '@/convex/_generated/api';
import {usePreloadedQuery, useQuery, type Preloaded } from "convex/react";
import { CallProvider } from './call-provider';
import { CallEnded } from './call-ended';


// import { CallProvider } from "../components/call-provider";

interface Props {
  preloadedConversation: Preloaded<typeof api.Conversations.GetConversationDetails>;
};

export const CallView = ({
  preloadedConversation
}: Props) => {
  const initialConversation = usePreloadedQuery(preloadedConversation);
  const liveConversation = useQuery(
    api.Conversations.GetConversationById,
    initialConversation?._id
      ? { conversationId: initialConversation._id }
      : "skip"
  );
  const conversation = liveConversation ?? initialConversation;

  if (!conversation) {
    return (
      <div className="py-4 px-8 flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center justify-center gap-y-6 bg-background rounded-lg p-10 shadow-sm">
          <div className="flex flex-col gap-y-2 text-center">
            <h6 className="text-lg font-medium">ERROR</h6>
            <p className="text-sm">Conversation not found.</p>
          </div>
        </div>
      </div>
    );
  }

  if (conversation.status === "completed") {
    return <CallEnded />;
  }

  return (
    <CallProvider
      conversationId={conversation._id}
      conversationName={conversation.name}
      transcriptText={conversation.transcriptText}
      personaName={conversation.personaName}
    />
  );
};
