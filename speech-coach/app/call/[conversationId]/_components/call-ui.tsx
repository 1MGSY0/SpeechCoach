import { useCallback, useEffect, useRef, useState } from "react";
import { StreamTheme, useCall } from "@stream-io/video-react-sdk";

import { CallLobby } from "./call-lobby";
import { CallActive } from "./call-active";
import { CallEnded } from "./call-ended";
import {
  endVoiceAgentSession,
  startVoiceAgentSession,
} from "@/services/voice-agent";

function mergeLiveTranscriptText(previousText: string, incomingText: string) {
  const next = incomingText.trim();
  const prev = previousText.trim();

  if (!prev) return next;
  if (!next) return prev;
  if (next.startsWith(prev)) return next;
  if (prev.startsWith(next)) return prev;

  const normalizedPrev = prev.toLowerCase();
  const normalizedNext = next.toLowerCase();
  const maxOverlap = Math.min(normalizedPrev.length, normalizedNext.length);

  for (let overlap = maxOverlap; overlap > 0; overlap -= 1) {
    if (
      normalizedPrev.slice(normalizedPrev.length - overlap) ===
      normalizedNext.slice(0, overlap)
    ) {
      return `${prev}${next.slice(overlap)}`;
    }
  }

  const shouldInsertSpace =
    !/[\\s([{/"'-]$/.test(prev) && !/^[\\s,.;:!?)}\]'"-]/.test(next);

  return `${prev}${shouldInsertSpace ? " " : ""}${next}`;
}

interface Props {
  conversationName: string;
  conversationId: string;
  userId: string;
  onEnsureCallReady: () => Promise<unknown>;
  onJoinError: (message: string) => void;
  userGoal?: string | null;
  transcriptText?: string | null;
  personaName?: string | null;
};

export const CallUI = ({
  conversationName,
  conversationId,
  userId,
  onEnsureCallReady,
  onJoinError,
  userGoal,
  transcriptText,
  personaName,
}: Props) => {
  const call = useCall();
  const [show, setShow] = useState<"lobby" | "call" | "ended">("lobby");
  const [isJoining, setIsJoining] = useState(false);
  const [livePartialTranscript, setLivePartialTranscript] = useState<{
    speaker: string;
    text: string;
    timestamp: string;
    isLive: boolean;
  } | null>(null);

  const endingRef = useRef(false);

  const finalizeSession = useCallback(async () => {
    if (endingRef.current) return;
    endingRef.current = true;

    try {
      await endVoiceAgentSession({
        conversationId,
        userId,
      });
    } catch (error) {
      console.error("Failed to end voice agent session:", error);
    } finally {
      setShow("ended");
    }
  }, [conversationId, userId]);

  useEffect(() => {
    if (!call) return;

    const handleCustomEvent = (event: { custom?: Record<string, unknown> }) => {
      const custom = event.custom ?? {};

      if (custom.type !== "speechcoach.transcript_partial") {
        return;
      }

      const speaker = typeof custom.speaker === "string" ? custom.speaker : "User";
      const text = typeof custom.text === "string" ? custom.text.trim() : "";
      if (!text) return;

      const timestamp = typeof custom.timestamp === "string" ? custom.timestamp : "live";

      setLivePartialTranscript((previous) => {
        const shouldMerge =
          previous &&
          previous.speaker === speaker &&
          previous.timestamp === timestamp &&
          previous.isLive;

        return {
          speaker,
          text: shouldMerge ? mergeLiveTranscriptText(previous.text, text) : text,
          timestamp,
          isLive: custom.isFinal !== true,
        };
      });
    };

    const handleSessionEnded = () => {
      void finalizeSession();
    };

    const unsubscribeCustom = call.on("custom", handleCustomEvent);
    const unsubscribeSessionEnded = call.on("call.session_ended", handleSessionEnded);

    return () => {
      unsubscribeCustom();
      unsubscribeSessionEnded();
    };
  }, [call, finalizeSession]);

  useEffect(() => {
    setLivePartialTranscript(null);
  }, [transcriptText]);

  const handleJoin = async () => {
    if (!call) return;

    try {
      setIsJoining(true);
      await onEnsureCallReady();
      await call.join();
      setShow("call");
      try {
        await startVoiceAgentSession({
          conversationId,
          userId,
        });
      } catch (error) {
        console.error("Failed to start voice agent:", error);
      }
    } catch (error) {
      console.error("Failed to join call:", error);
      const message =
        error instanceof Error ? error.message : "Unable to connect to the call.";
      onJoinError(message);
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!call) return;

    try {
      await call.endCall();
    } catch (error) {
      console.error("Failed to end call:", error);
    } finally {
      await finalizeSession();
    }
  };

  return (
    <StreamTheme className="h-full">
      {show === "lobby" && <CallLobby onJoin={handleJoin} isJoining={isJoining} />}
      {show === "call" && (
        <CallActive
          onLeave={handleLeave}
          conversationName={conversationName}
          userGoal={userGoal}
          transcriptText={transcriptText}
          personaName={personaName}
          livePartialTranscript={livePartialTranscript}
        />
      )}
      {show === "ended" && <CallEnded conversationId={conversationId} />}
    </StreamTheme>
  )
};
