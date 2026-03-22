"use client";
import { usePreloadedQuery } from "convex/react";

export default function ConversationView({ preloadedConversations }) {
  const conversations = usePreloadedQuery(preloadedConversations);

  if (!conversations || conversations.length === 0) {
    return <div>No conversations found.</div>;
  }

  return (
    <div className="flex-1 pb-4 px-4 md:px-8 flex flex-col gap-y-4">
      <pre className="text-xs whitespace-pre-wrap">
        {JSON.stringify(conversations, null, 2)}
      </pre>
    </div>
  );
}

// Persona: jh71at3z0n7p9wph3bfrk65cnn83amd1
// User: js7dqx6xxqpz5shhm6t6vhm1bn83aqjw