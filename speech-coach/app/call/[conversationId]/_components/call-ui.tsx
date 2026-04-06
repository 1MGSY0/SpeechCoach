import { useCallback, useEffect, useRef, useState } from "react";
import { StreamTheme, useCall } from "@stream-io/video-react-sdk";

import { CallLobby } from "./call-lobby";
import { CallActive } from "./call-active";
import { CallEnded } from "./call-ended";
import {
  endVoiceAgentSession,
  startVoiceAgentSession,
} from "@/services/voice-agent";

interface Props {
  conversationName: string;
  conversationId: string;
  userId: string;
  transcriptText?: string | null;
  personaName?: string | null;
};

export const CallUI = ({
  conversationName,
  conversationId,
  userId,
  transcriptText,
  personaName,
}: Props) => {
  const call = useCall();
  const [show, setShow] = useState<"lobby" | "call" | "ended">("lobby");
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

      setLivePartialTranscript({
        speaker,
        text,
        timestamp: typeof custom.timestamp === "string" ? custom.timestamp : "live",
        isLive: custom.isFinal !== true,
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
      {show === "lobby" && <CallLobby onJoin={handleJoin} />}
      {show === "call" && (
        <CallActive
          onLeave={handleLeave}
          conversationName={conversationName}
          transcriptText={transcriptText}
          personaName={personaName}
          livePartialTranscript={livePartialTranscript}
        />
      )}
      {show === "ended" && <CallEnded />}
    </StreamTheme>
  )
};
