import { notFound } from 'next/navigation';
import React from 'react'

interface Props {
    params: Promise<{ conversationId: string }>;
}

export default async function Page({ params }: Props) {
    const { conversationId } = (await params) ?? {};
    if (!conversationId || typeof conversationId !== "string") {
        notFound();
    }

    return (
      <div>
        Conversation {conversationId} Page
      </div>
    )
}

