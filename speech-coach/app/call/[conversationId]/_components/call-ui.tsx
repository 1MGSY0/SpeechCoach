import { useState } from "react";
import { StreamTheme, useCall } from "@stream-io/video-react-sdk";

import { CallLobby } from "./call-lobby";
import { CallActive } from "./call-active";
import { CallEnded } from "./call-ended";

interface Props {
  conversationName: string;
};

export const CallUI = ({ conversationName }: Props) => {
  const call = useCall();
  const [show, setShow] = useState<"lobby" | "call" | "ended">("lobby");

  const handleJoin = async () => {
    if (!call) return;

    try {
      await call.join();
      setShow("call");
    } catch (error) {
      console.error("Failed to join call:", error);
    }
  };

  const handleLeave = () => {
    if (!call) return;

    call.endCall();
    setShow("ended");
  };

  return (
    <StreamTheme className="h-full">
      {show === "lobby" && <CallLobby onJoin={handleJoin} />}
      {show === "call" && <CallActive onLeave={handleLeave} conversationName={conversationName} />}
      {show === "ended" && <CallEnded />}
    </StreamTheme>
  )
};