export interface VoiceAgentSessionRequest {
  conversationId: string;
  userId: string;
}

async function requestVoiceAgentSession(
  method: "POST" | "DELETE",
  request: VoiceAgentSessionRequest
) {
  const response = await fetch("/api/voice-agent", {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to ${method} voice agent session.`);
  }

  return response.json();
}

export function startVoiceAgentSession(request: VoiceAgentSessionRequest) {
  return requestVoiceAgentSession("POST", request);
}

export function endVoiceAgentSession(request: VoiceAgentSessionRequest) {
  return requestVoiceAgentSession("DELETE", request);
}