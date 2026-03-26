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
};

export const CallUI = ({ conversationName, conversationId, userId }: Props) => {
  const call = useCall();
  const [show, setShow] = useState<"lobby" | "call" | "ended">("lobby");

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

    const handleSessionEnded = () => {
      void finalizeSession();
    };

    call.on("call.session_ended", handleSessionEnded);

    return () => {
      call.off("call.session_ended", handleSessionEnded);
    };
  }, [call, finalizeSession]);

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
      {show === "call" && <CallActive onLeave={handleLeave} conversationName={conversationName} />}
      {show === "ended" && <CallEnded />}
    </StreamTheme>
  )
};