import { NextRequest, NextResponse } from "next/server";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { stripPersonaMeta } from "@/components/extract-persona";
import { composeRoleplayInstructions } from "@/lib/semantic-memory";
import { serverFetchMutation, serverFetchQuery } from "@/lib/convex-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const voiceAgentBaseUrl =
  process.env.VOICE_AGENT_URL;

const voiceNameByGender = {
  female: "Leda",
  male: "Puck",
} as const;

function getConversationPipeline(conversation: { modelPipeline?: string | null }) {
  return conversation.modelPipeline === "gemini_cascade"
    ? "gemini_cascade"
    : "gemini_realtime";
}

function getConversationVoice(conversation: { voiceGender?: string | null; voiceName?: string | null }) {
  if (conversation.voiceName) {
    return conversation.voiceName;
  }

  if (conversation.voiceGender === "male") {
    return voiceNameByGender.male;
  }

  return voiceNameByGender.female;
}

function isSemanticMemoryEnabled(conversation: { semanticMemoryEnabled?: boolean | null }) {
  return conversation.semanticMemoryEnabled !== false;
}

function getConversationInstructions(
  conversation: { summary?: string | null; semanticMemoryEnabled?: boolean | null },
  baseInstructions: string
) {
  return composeRoleplayInstructions({
    baseInstructions,
    memoryJson: isSemanticMemoryEnabled(conversation)
      ? conversation.summary ?? ""
      : "",
  });
}

export async function GET(req: NextRequest) {
  

  const param_conversationId = req.nextUrl.searchParams.get("conversationId");

  if (!param_conversationId) {
    return NextResponse.json({ error: "Missing conversationId" }, { status: 400 });
  }
  const conversationId = param_conversationId as Id<"Conversations">;

  const conversation = await serverFetchQuery(api.Conversations.GetConversationById, {
    conversationId,
  });


  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const persona = await serverFetchQuery(api.Persona.GetPersonaDetails, {
    userId: conversation.userId,
    personaId: conversation.personaId,
  });

  if (!persona) {
    return NextResponse.json({ error: "Persona not found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      conversationId: conversation._id,
      personaId: persona._id,
      personaName: persona.name,
      instructions: getConversationInstructions(
        conversation,
        stripPersonaMeta(persona.instructions) ?? ""
      ),
      conversationName: conversation.name ?? "",
      userId: conversation.userId,
      userName: conversation.userName ?? "User",
      modelPipeline: getConversationPipeline(conversation),
      voiceGender: conversation.voiceGender ?? "female",
      voiceName: getConversationVoice(conversation),
      semanticMemoryEnabled: isSemanticMemoryEnabled(conversation),
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}

export async function POST(req: NextRequest) {
  const payload = (await req.json()) as {
    conversationId?: string;
    userId?: string;
  };

  if (!payload.conversationId || !payload.userId) {
    return NextResponse.json(
      { error: "Missing conversationId or userId" },
      { status: 400 }
    );
  }

  if (!voiceAgentBaseUrl) {
    return NextResponse.json(
      { error: "VOICE_AGENT_URL is not configured." },
      { status: 500 }
    );
  }

  const userId = payload.userId as Id<"User">;
  const conversationId = payload.conversationId as Id<"Conversations">;

  const conversation = await serverFetchQuery(api.Conversations.GetConversationDetails, {
    userId,
    conversationId,
  });

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  if (
    conversation.status === "active" ||
    conversation.status === "completed" ||
    conversation.status === "cancelled" ||
    conversation.status === "processing"
  ) {
    return NextResponse.json(
      { error: "Conversation is not available" },
      { status: 400 }
    );
  }

  const persona = await serverFetchQuery(api.Persona.GetPersonaDetails, {
    userId,
    personaId: conversation.personaId,
  });

  if (!persona) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  await serverFetchMutation(api.Conversations.UpdateConversation, {
    userId,
    conversationId,
    status: "active",
    startedAt: new Date().toISOString(),
  });


  const response = await fetch(
    `${voiceAgentBaseUrl}/calls/${encodeURIComponent(payload.conversationId)}/sessions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        conversationId,
        personaId: persona._id,
        personaName: persona.name,
        instructions: getConversationInstructions(
          conversation,
          stripPersonaMeta(persona.instructions) ?? ""
        ),
        conversationName: conversation.name,
        userId,
        userName: conversation.userName,
        modelPipeline: getConversationPipeline(conversation),
        voiceGender: conversation.voiceGender ?? "female",
        voiceName: getConversationVoice(conversation),
        semanticMemoryEnabled: isSemanticMemoryEnabled(conversation),
      }),
    }
  );

  if (!response.ok) {
    const message = await response.text();
    return NextResponse.json(
      { error: message || "Failed to start voice agent session." },
      { status: 400 }
    );
  }

  const responsePayload = (await response.json()) as { session_id?: string };

  return NextResponse.json({
    status: "ok",
    sessionId: responsePayload.session_id,
  });
}

export async function DELETE(req: NextRequest) {
  const payload = (await req.json()) as {
    conversationId?: string;
    userId?: string;
  };

  if (!payload.conversationId || !payload.userId) {
    return NextResponse.json(
      { error: "Missing conversationId or userId" },
      { status: 400 }
    );
  }

  const userId = payload.userId as Id<"User">;
  const conversationId = payload.conversationId as Id<"Conversations">;

  const conversation = await serverFetchQuery(api.Conversations.GetConversationDetails, {
    userId,
    conversationId,
  });

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  if (
    conversation.status === "completed" ||
    conversation.status === "cancelled"
  ) {
    return NextResponse.json({ status: "ok" });
  }

  await serverFetchMutation(api.Conversations.UpdateConversation, {
    userId,
    conversationId,
    status: "processing",
    endedAt: new Date().toISOString(),
  });

  return NextResponse.json({ status: "ok" });
}
